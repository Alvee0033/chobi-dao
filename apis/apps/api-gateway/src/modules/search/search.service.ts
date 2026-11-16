import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { ObjectStorageService } from "../../common/services/storage.service";
import { Queue } from "bullmq";
import jwt from "jsonwebtoken";
import { parseEnv } from "../../config/env";
import { randomUUID } from "crypto";
import { acceptedMatch, cosineSimilarity, MATCH_CANDIDATE_THRESHOLD, SCAN_CONSISTENCY_THRESHOLD } from "./matching";

@Injectable()
export class SearchService {
  private readonly env = parseEnv();
  private zipQueue: Queue | null = null;

  constructor(private readonly prisma: PrismaService, private readonly storage: ObjectStorageService) {}

  private getZipQueue() {
    if (!this.zipQueue) {
      this.zipQueue = new Queue("zip-generation", {
        connection: {
          url: this.env.REDIS_URL,
          lazyConnect: true,
          maxRetriesPerRequest: null,
        },
      });
    }
    return this.zipQueue;
  }

  private signMediaToken(photoId: string, variant: "image" | "thumb"): string {
    return jwt.sign(
      { photoId, variant, typ: "media" },
      this.env.JWT_ACCESS_SECRET,
      { expiresIn: "4h" },
    );
  }

  private buildMediaUrl(apiBase: string, photoId: string, variant: "image" | "thumb") {
    const t = this.signMediaToken(photoId, variant);
    const base = apiBase ? apiBase.replace(/\/+$/, "") : "";
    return `${base}/v1/media/photos/${encodeURIComponent(photoId)}/${variant}?t=${encodeURIComponent(t)}`;
  }

  async search(slug: string, livenessToken: string, images: string[], apiBase?: string) {
    if (!livenessToken) throw new UnauthorizedException("Missing liveness token");
    let tokenPayload: { eventSlug: string };
    try {
      tokenPayload = jwt.verify(livenessToken, this.env.LIVENESS_TOKEN_SECRET) as { eventSlug: string };
    } catch {
      throw new UnauthorizedException("Invalid liveness token");
    }
    if (tokenPayload.eventSlug !== slug) throw new UnauthorizedException("Token/event mismatch");

    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event || event.deletedAt) throw new NotFoundException("Event not found");

    if (!Array.isArray(images) || images.length < 1 || images.length > 3) {
      await this.prisma.scanEvent.create({ data: { eventId: event.id, result: "error", matchCount: 0 } });
      throw new BadRequestException("Provide one to three face images");
    }

    const similarityMap = new Map<string, number>();
    const scoresByPhoto = new Map<string, number[]>();

    try {
      const vectors: string[] = [];
      const embeddings: number[][] = [];
      for (const image of images) {
        if (typeof image !== "string" || image.length > 2_800_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) {
          throw new BadRequestException("Invalid face image format");
        }
        const imageBuffer = Buffer.from(image.slice(image.indexOf(",") + 1), "base64");
        if (imageBuffer.length === 0 || imageBuffer.length > 2 * 1024 * 1024) {
          throw new BadRequestException("Each face image must be under 2 MB");
        }
        const formData = new FormData();
        formData.append("file", new Blob([new Uint8Array(imageBuffer)]), "face.jpg");
        const aiRes = await fetch(`${this.env.AI_SERVICE_URL}/analyze`, { method: "POST", body: formData });
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
        embeddings.push(embedding);
        vectors.push(`[${embedding.join(",")}]`);
      }

      if (embeddings.length > 1 && embeddings.slice(1).some((embedding) => cosineSimilarity(embeddings[0], embedding) < SCAN_CONSISTENCY_THRESHOLD)) {
        throw new BadRequestException("The scan views do not appear to be the same person. Please retake them");
      }

      // Retrieve candidates per view; only confirmed matches are exposed below.
      for (const [viewIndex, vector] of vectors.entries()) {
        const rows = await this.prisma.$queryRawUnsafe<Array<{ photo_id: string; similarity: number }>>(
          `SELECT photo_id, MAX(1 - (embedding <=> $1::vector)) AS similarity
           FROM "face_embeddings"
           WHERE event_id = $2::uuid AND (1 - (embedding <=> $1::vector)) >= $3
           GROUP BY photo_id`,
          vector,
          event.id,
          MATCH_CANDIDATE_THRESHOLD,
        );
        for (const row of rows) {
          const score = Number(row.similarity);
          const scores = scoresByPhoto.get(row.photo_id) ?? Array(vectors.length).fill(0);
          scores[viewIndex] = score;
          scoresByPhoto.set(row.photo_id, scores);
          similarityMap.set(row.photo_id, Math.max(score, similarityMap.get(row.photo_id) ?? 0));
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error("Local face search error:", error);
      await this.prisma.scanEvent.create({ data: { eventId: event.id, result: "error", matchCount: 0 } });
      throw new BadRequestException("Face scan search failed. Please try again with clear lighting.");
    }

    for (const [photoId, scores] of scoresByPhoto) {
      if (!acceptedMatch(scores)) similarityMap.delete(photoId);
    }

    const photos = await this.prisma.photo.findMany({
      where: {
        id: { in: [...similarityMap.keys()] },
        eventId: event.id,
        indexStatus: "indexed",
      },
    });

    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const indexingCount = await this.prisma.photo.count({
      where: { eventId: event.id, indexStatus: { in: ["pending", "uploaded", "indexing"] } },
    });

    await this.prisma.scanEvent.create({ data: { eventId: event.id, result: "success", matchCount: photos.length } });

    await this.prisma.guestSession.create({
      data: {
        eventId: event.id,
        sessionToken,
        matchedPhotoIds: photos.map((p) => p.id),
        expiresAt,
      },
    });

    const effectiveApiBase = apiBase || this.env.API_BASE_URL || "";

    const mappedPhotos = photos
      .map((photo) => {
        const fullUrl = this.buildMediaUrl(effectiveApiBase, photo.id, "image");
        const thumbUrl = this.buildMediaUrl(effectiveApiBase, photo.id, "thumb");

        return {
          id: photo.id,
          thumbUrl,
          thumbSmallUrl: thumbUrl,
          thumbMediumUrl: thumbUrl,
          fullUrl,
          urlExpiresAt: expiresAt.toISOString(),
          similarity: similarityMap.get(photo.id) ?? 0.95,
        };
      })
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

    return {
      count: mappedPhotos.length,
      photos: mappedPhotos,
      sessionToken,
      indexingCount,
    };
  }

  async createZip(slug: string, sessionToken: string) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event) throw new NotFoundException("Event not found");
    const session = await this.prisma.guestSession.findUnique({ where: { sessionToken } });
    if (!session || session.eventId !== event.id) throw new UnauthorizedException("Invalid search session");
    const job = await this.getZipQueue().add("zip-create", { slug, eventId: event.id, sessionToken }, { attempts: 3 });
    return { jobId: job.id };
  }

  async zipStatus(slug: string, jobId: string) {
    if (!slug) throw new BadRequestException("Missing slug");
    const key = `events/${slug}/zips/${jobId}.zip`;
    return { status: "ready", downloadUrl: await this.storage.getPublicReadUrl(key, 86400) };
  }
}

