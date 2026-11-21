import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import jwt from "jsonwebtoken";
import { parseEnv } from "../../config/env";
import { randomUUID } from "crypto";
import { acceptedMatch, MATCH_CANDIDATE_THRESHOLD, validateScanEmbeddings } from "./matching";
import { guestCanRemoveOriginal } from "./photo-removal-policy";

const GUEST_GALLERY_PAGE_SIZE = 48;

@Injectable()
export class SearchService {
  private readonly env = parseEnv();

  constructor(private readonly prisma: PrismaService) {}

  private signMediaToken(photoId: string, variant: "image" | "thumb"): string {
    return jwt.sign(
      { photoId, variant, typ: "media" },
      this.env.JWT_ACCESS_SECRET,
      { expiresIn: "24h" },
    );
  }

  private buildMediaUrl(apiBase: string, photoId: string, variant: "image" | "thumb") {
    const t = this.signMediaToken(photoId, variant);
    const base = apiBase ? apiBase.replace(/\/+$/, "") : "";
    return `${base}/v1/media/photos/${encodeURIComponent(photoId)}/${variant}?t=${encodeURIComponent(t)}`;
  }

  async search(slug: string, livenessToken: string, images: string[], apiBase?: string) {
    if (!livenessToken) throw new UnauthorizedException("Missing liveness token");
    let tokenPayload: { eventSlug: string; jti?: string };
    try {
      tokenPayload = jwt.verify(livenessToken, this.env.LIVENESS_TOKEN_SECRET) as { eventSlug: string };
    } catch {
      throw new UnauthorizedException("Invalid liveness token");
    }
    if (tokenPayload.eventSlug !== slug) throw new UnauthorizedException("Token/event mismatch");

    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event || event.deletedAt) throw new NotFoundException("Event not found");

    const photographer = await this.prisma.photographer.findUnique({ where: { id: event.photographerId }, select: { trialEndsAt: true } });
    const subscription = await this.prisma.subscription.findFirst({
      where: { photographerId: event.photographerId, status: "succeeded", currentPeriodEnd: { gt: new Date() } }, select: { id: true },
    });
    if (!subscription && (!photographer || photographer.trialEndsAt <= new Date())) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const matchesUsed = await this.prisma.scanEvent.count({
        where: { event: { photographerId: event.photographerId }, result: "success", createdAt: { gte: monthStart } },
      });
      if (matchesUsed >= 100) throw new HttpException("This event has reached the free plan's monthly match limit.", HttpStatus.PAYMENT_REQUIRED);
    }

    if (!Array.isArray(images) || images.length < 1 || images.length > 3) {
      await this.prisma.scanEvent.create({ data: { eventId: event.id, result: "error", matchCount: 0 } });
      throw new BadRequestException("Provide one to three face images");
    }

    if (!tokenPayload.jti) throw new UnauthorizedException("Invalid or already used scan challenge");
    const consumed = await this.prisma.livenessChallenge.updateMany({
      where: { id: tokenPayload.jti, eventId: event.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new UnauthorizedException("Scan challenge expired or already used. Please scan again.");

    const similarityMap = new Map<string, number>();
    const scoresByPhoto = new Map<string, number[]>();

    try {
      const embeddings = await Promise.all(images.map(async (image) => {
        if (typeof image !== "string" || image.length > 2_800_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) {
          throw new BadRequestException("Invalid face image format");
        }
        const imageBuffer = Buffer.from(image.slice(image.indexOf(",") + 1), "base64");
        if (imageBuffer.length === 0 || imageBuffer.length > 2 * 1024 * 1024) {
          throw new BadRequestException("Each face image must be under 2 MB");
        }
        const formData = new FormData();
        formData.append("file", new Blob([new Uint8Array(imageBuffer)]), "face.jpg");
        const aiRes = await fetch(`${this.env.AI_SERVICE_URL}/analyze`, { method: "POST", body: formData, signal: AbortSignal.timeout(20_000) });
        if (!aiRes.ok) throw new Error(`Face analysis returned ${aiRes.status}`);
        const aiData = (await aiRes.json()) as { faces?: Array<{ embedding: number[]; det_score?: number }> };
        if (aiData.faces?.length !== 1) {
          throw new BadRequestException("Each image must contain exactly one clear face");
        }
        const embedding = aiData.faces[0].embedding;
        if (!Array.isArray(embedding) || embedding.length !== 512 || !embedding.every(Number.isFinite)) {
          throw new Error("Invalid face embedding");
        }
        if ((aiData.faces[0].det_score ?? 1) < 0.6) {
          throw new BadRequestException("Face is unclear. Please retake the scan in good lighting");
        }
        return embedding;
      }));

      if (!validateScanEmbeddings(embeddings)) {
        throw new BadRequestException("The scan views do not appear to be the same person. Please retake them");
      }

      // Retrieve each view's candidates concurrently; keep the view-level scores for consensus.
      const candidatesByView = await Promise.all(embeddings.map((embedding) => {
        const vector = `[${embedding.join(",")}]`;
        return this.prisma.$queryRawUnsafe<Array<{ photo_id: string; similarity: number }>>(
          `SELECT photo_id, MAX(1 - (embedding <=> $1::vector)) AS similarity
           FROM "face_embeddings"
           WHERE event_id = $2::uuid AND (1 - (embedding <=> $1::vector)) >= $3
             AND EXISTS (SELECT 1 FROM "photos" p WHERE p.id = "face_embeddings".photo_id AND p.deleted_at IS NULL)
           GROUP BY photo_id`,
          vector,
          event.id,
          MATCH_CANDIDATE_THRESHOLD,
        );
      }));
      for (const [viewIndex, rows] of candidatesByView.entries()) {
        for (const row of rows) {
          const score = Number(row.similarity);
          const scores = scoresByPhoto.get(row.photo_id) ?? Array(embeddings.length).fill(0);
          scores[viewIndex] = score;
          scoresByPhoto.set(row.photo_id, scores);
          similarityMap.set(row.photo_id, Math.max(score, similarityMap.get(row.photo_id) ?? 0));
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error("Local face search error:", error);
      await this.prisma.scanEvent.create({ data: { eventId: event.id, result: "error", matchCount: 0 } });
      throw new HttpException("Face scan search is temporarily unavailable. Please try again shortly.", HttpStatus.SERVICE_UNAVAILABLE);
    }

    for (const [photoId, scores] of scoresByPhoto) {
      if (!acceptedMatch(scores)) similarityMap.delete(photoId);
    }

    const rankedMatches = [...similarityMap.entries()].sort((a, b) => b[1] - a[1]);
    const matchedPhotoIds = rankedMatches.map(([photoId]) => photoId);
    const matchedScores = rankedMatches.map(([, score]) => score);
    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const indexingCount = await this.prisma.photo.count({
      where: { eventId: event.id, indexStatus: { in: ["pending", "uploaded", "indexing"] } },
    });

    await this.prisma.scanEvent.create({ data: { eventId: event.id, result: "success", matchCount: matchedPhotoIds.length } });

    await this.prisma.guestSession.create({
      data: {
        eventId: event.id,
        sessionToken,
        matchedPhotoIds,
        matchedScores,
        expiresAt,
      },
    });

    const effectiveApiBase = apiBase || this.env.API_BASE_URL || "";
    const mappedPhotos = await this.mapSessionPhotoPage(event.id, matchedPhotoIds, matchedScores, 0, expiresAt, effectiveApiBase);

    return {
      count: matchedPhotoIds.length,
      photos: mappedPhotos,
      sessionToken,
      indexingCount,
      nextOffset: Math.min(GUEST_GALLERY_PAGE_SIZE, matchedPhotoIds.length),
      hasMore: matchedPhotoIds.length > GUEST_GALLERY_PAGE_SIZE,
    };
  }

  private async mapSessionPhotoPage(
    eventId: string,
    photoIds: string[],
    scores: number[],
    offset: number,
    expiresAt: Date,
    apiBase: string,
  ) {
    const pageIds = photoIds.slice(offset, offset + GUEST_GALLERY_PAGE_SIZE);
    if (!pageIds.length) return [];
    const photos = await this.prisma.photo.findMany({
      where: { id: { in: pageIds }, eventId, indexStatus: "indexed", deletedAt: null },
    });
    const byId = new Map(photos.map((photo) => [photo.id, photo]));
    return pageIds.flatMap((photoId, index) => {
      const photo = byId.get(photoId);
      if (!photo) return [];
      const thumbUrl = this.buildMediaUrl(apiBase, photo.id, "thumb");
      return [{
        id: photo.id,
        thumbUrl,
        thumbSmallUrl: thumbUrl,
        thumbMediumUrl: thumbUrl,
        fullUrl: this.buildMediaUrl(apiBase, photo.id, "image"),
        urlExpiresAt: expiresAt.toISOString(),
        similarity: scores[offset + index] ?? 0,
        canRemoveOriginal: guestCanRemoveOriginal(photo),
      }];
    });
  }

  async getSessionPhotos(slug: string, sessionToken: string, offset: number, apiBase?: string) {
    if (!Number.isSafeInteger(offset) || offset < 0) throw new BadRequestException("Invalid gallery page");
    const event = await this.prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (!event) throw new NotFoundException("Event not found");
    const session = await this.prisma.guestSession.findUnique({ where: { sessionToken } });
    if (!session || session.eventId !== event.id || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Gallery session expired. Please scan again.");
    }
    const photos = await this.mapSessionPhotoPage(
      event.id,
      session.matchedPhotoIds,
      session.matchedScores,
      offset,
      session.expiresAt,
      apiBase || this.env.API_BASE_URL || "",
    );
    const nextOffset = Math.min(offset + GUEST_GALLERY_PAGE_SIZE, session.matchedPhotoIds.length);
    return { count: session.matchedPhotoIds.length, photos, nextOffset, hasMore: nextOffset < session.matchedPhotoIds.length };
  }

  async createZip(slug: string, sessionToken: string) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event) throw new NotFoundException("Event not found");
    const session = await this.prisma.guestSession.findUnique({ where: { sessionToken } });
    if (!session || session.eventId !== event.id || session.expiresAt <= new Date()) throw new UnauthorizedException("Invalid or expired search session");
    throw new HttpException("ZIP downloads are not available yet. Download matched photos individually.", HttpStatus.NOT_IMPLEMENTED);
  }

  async requestPhotoRemoval(slug: string, sessionToken: string, photoId: string) {
    if (!sessionToken || !photoId) throw new UnauthorizedException("A valid gallery session is required");
    const event = await this.prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (!event) throw new NotFoundException("Event not found");
    const session = await this.prisma.guestSession.findUnique({ where: { sessionToken } });
    if (!session || session.eventId !== event.id || session.expiresAt <= new Date() || !session.matchedPhotoIds.includes(photoId)) {
      throw new UnauthorizedException("This photo is not part of your active gallery session");
    }
    const photo = await this.prisma.photo.findFirst({ where: { id: photoId, eventId: event.id, deletedAt: null } });
    if (!photo) throw new NotFoundException("Photo not found");
    if (guestCanRemoveOriginal(photo)) {
      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.photo.updateMany({ where: { id: photo.id, deletedAt: null }, data: { deletedAt: now } });
        if (changed.count === 0) return;
        await tx.photoRemovalRequest.upsert({
          where: { photoId_guestSessionId: { photoId, guestSessionId: session.id } },
          create: { eventId: event.id, photoId, guestSessionId: session.id, status: "approved", reviewedAt: now },
          update: { status: "approved", reviewedAt: now },
        });
        await tx.event.update({ where: { id: event.id }, data: { totalPhotos: { decrement: 1 }, indexedPhotos: { decrement: 1 } } });
        const sessions = await tx.guestSession.findMany({ where: { eventId: event.id, matchedPhotoIds: { has: photoId } }, select: { id: true, matchedPhotoIds: true, matchedScores: true } });
        for (const active of sessions) {
          const indexes = active.matchedPhotoIds.map((id, index) => id === photoId ? index : -1).filter((index) => index >= 0);
          await tx.guestSession.update({ where: { id: active.id }, data: {
            matchedPhotoIds: active.matchedPhotoIds.filter((id) => id !== photoId),
            matchedScores: active.matchedScores.filter((_, index) => !indexes.includes(index)),
          } });
        }
      });
      return { status: "removed", recoverableUntil: new Date(now.getTime() + 30 * 86400000).toISOString() };
    }
    const request = await this.prisma.photoRemovalRequest.upsert({
      where: { photoId_guestSessionId: { photoId, guestSessionId: session.id } },
      create: { eventId: event.id, photoId, guestSessionId: session.id },
      update: { status: "pending", reviewedAt: null },
    });
    return { status: request.status === "pending" ? "review_requested" : request.status };
  }

  async zipStatus(slug: string, jobId: string) {
    void slug;
    void jobId;
    throw new HttpException("ZIP downloads are not available yet.", HttpStatus.NOT_IMPLEMENTED);
  }
}

