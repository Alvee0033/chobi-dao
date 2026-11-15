import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { ObjectStorageService } from "../../common/services/storage.service";
import { Queue } from "bullmq";
import jwt from "jsonwebtoken";
import { parseEnv } from "../../config/env";
import { randomUUID } from "crypto";

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

  async search(slug: string, livenessToken: string, base64Image?: string, apiBase?: string) {
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

    if (!base64Image) {
      await this.prisma.scanEvent.create({ data: { eventId: event.id, result: "error", matchCount: 0 } });
      throw new BadRequestException("Missing search image");
    }

    let matchedPhotoIds: string[] = [];
    const similarityMap = new Map<string, number>();

    try {
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // 1. Fast Local InsightFace embedding extraction
      const formData = new FormData();
      formData.append("file", new Blob([new Uint8Array(imageBuffer)]), "selfie.jpg");
      const aiRes = await fetch(`${this.env.AI_SERVICE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (aiRes.ok) {
        const aiData = (await aiRes.json()) as { faces?: Array<{ embedding: number[]; det_score?: number }> };
        const mainFace = aiData.faces?.[0];
        if (mainFace && Array.isArray(mainFace.embedding) && mainFace.embedding.length === 512) {
          const vectorStr = `[${mainFace.embedding.join(",")}]`;

          // 2. Ultra-fast pgvector cosine distance search
          // InsightFace cosine similarity: >= 0.58 ensures accurate same-person matches without false positive crosses
          const rows = await this.prisma.$queryRawUnsafe<Array<{ photo_id: string; similarity: number }>>(
            `SELECT photo_id, 1 - (embedding <=> $1::vector) as similarity
             FROM "face_embeddings"
             WHERE event_id = $2::uuid AND (1 - (embedding <=> $1::vector)) >= 0.58
             ORDER BY similarity DESC`,
            vectorStr,
            event.id,
          );

          for (const r of rows) {
            matchedPhotoIds.push(r.photo_id);
            similarityMap.set(r.photo_id, Number(r.similarity));
          }
        }
      }
    } catch (error) {
      console.error("Local face search error:", error);
      await this.prisma.scanEvent.create({ data: { eventId: event.id, result: "error", matchCount: 0 } });
      throw new BadRequestException("Face scan search failed. Please try again with clear lighting.");
    }

    const photos = await this.prisma.photo.findMany({
      where: {
        id: { in: matchedPhotoIds },
        eventId: event.id,
        indexStatus: "indexed",
      },
    });

    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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

