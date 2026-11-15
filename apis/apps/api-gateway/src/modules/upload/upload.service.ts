import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { ObjectStorageService } from "../../common/services/storage.service";
import type { MultipartCompleteRequestDto, MultipartPresignPartsRequestDto, MultipartUploadInitRequestDto, UploadUrlRequestDto } from "@framefind/shared-contracts";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { parseEnv } from "../../config/env";
import { Readable } from "stream";
import { Queue } from "bullmq";

@Injectable()
export class UploadService {
  private readonly env = parseEnv();
  private readonly thumbCache = new Map<string, { body: Buffer; contentType: string; expiresAt: number }>();
  private readonly tokenCache = new Map<string, { token: string; expiresAt: number }>();
  private readonly peopleCache = new Map<string, { value: EventPersonSummary[]; expiresAt: number }>();
  private faceIndexQueue: Queue | null = null;

  constructor(private readonly prisma: PrismaService, private readonly storage: ObjectStorageService) {}

  private getFaceIndexQueue() {
    if (!this.faceIndexQueue) {
      this.faceIndexQueue = new Queue("face-index", {
        connection: {
          url: this.env.REDIS_URL,
          lazyConnect: true,
          maxRetriesPerRequest: null,
        },
      });
    }
    return this.faceIndexQueue;
  }

  private invalidatePeopleCache(eventId: string) {
    this.peopleCache.delete(eventId);
  }

  private async indexFacesInline(eventId: string, photoId: string, bytes: Buffer): Promise<void> {
    try {
      const current = await this.prisma.photo.findUnique({ where: { id: photoId }, select: { indexStatus: true } });
      if (!current || current.indexStatus === "indexed") return;

      let faceCount = 0;
      try {
        const formData = new FormData();
        formData.append("file", new Blob([new Uint8Array(bytes)]), "photo.jpg");
        const aiRes = await fetch(`${this.env.AI_SERVICE_URL}/analyze`, {
          method: "POST",
          body: formData,
        });

        if (aiRes.ok) {
          const aiData = (await aiRes.json()) as {
            faces?: Array<{
              bbox: [number, number, number, number];
              embedding: number[];
              det_score?: number;
            }>;
          };

          const detectedFaces = aiData.faces || [];
          faceCount = detectedFaces.length;
          let currentPersonCount = await this.prisma.person.count({ where: { eventId } });

          for (const face of detectedFaces) {
            if (!face.embedding || face.embedding.length !== 512) continue;
            const faceId = randomUUID();
            const vectorStr = `[${face.embedding.join(",")}]`;

            // Store in face_embeddings via pgvector
            try {
              await this.prisma.$executeRawUnsafe(
                `INSERT INTO "face_embeddings" ("id", "photo_id", "event_id", "embedding", "bbox", "det_score", "created_at")
                 VALUES ($1::uuid, $2::uuid, $3::uuid, $4::vector, $5::jsonb, $6, NOW())
                 ON CONFLICT ("id") DO NOTHING`,
                faceId,
                photoId,
                eventId,
                vectorStr,
                JSON.stringify(face.bbox),
                face.det_score ?? 0.95,
              );
            } catch (pgErr) {
              console.warn("pgvector insert notice:", pgErr);
            }

            // Cluster or create Person
            let matchedPersonId: string | null = null;
            try {
              const similarRows = await this.prisma.$queryRawUnsafe<Array<{ person_id: string; similarity: number }>>(
                `SELECT f.person_id, (1 - (fe.embedding <=> $3::vector)) AS similarity
                 FROM "face_embeddings" fe
                 JOIN "faces" f ON f.id = fe.id::text
                 WHERE fe.event_id = $1::uuid 
                   AND fe.photo_id != $2::uuid
                   AND (1 - (fe.embedding <=> $3::vector)) >= 0.60
                 ORDER BY similarity DESC
                 LIMIT 1`,
                eventId,
                photoId,
                vectorStr,
              );
              if (similarRows.length > 0 && similarRows[0].person_id) {
                matchedPersonId = similarRows[0].person_id;
              }
            } catch (clusterErr) {
              console.error("Upload clustering query error:", clusterErr);
            }

            if (!matchedPersonId) {
              currentPersonCount += 1;
              const person = await this.prisma.person.create({
                data: { eventId, name: `Person ${currentPersonCount}` },
              });
              matchedPersonId = person.id;
            }

            await this.prisma.face.upsert({
              where: { id: faceId },
              update: {
                photoId,
                personId: matchedPersonId,
                boundingBox: {
                  Left: face.bbox[0],
                  Top: face.bbox[1],
                  Width: face.bbox[2] - face.bbox[0],
                  Height: face.bbox[3] - face.bbox[1],
                },
              },
              create: {
                id: faceId,
                photoId,
                personId: matchedPersonId,
                boundingBox: {
                  Left: face.bbox[0],
                  Top: face.bbox[1],
                  Width: face.bbox[2] - face.bbox[0],
                  Height: face.bbox[3] - face.bbox[1],
                },
              },
            });
          }
        }
      } catch (aiErr) {
        console.warn("Local AI service error during inline indexing:", aiErr);
      }

      const latest = await this.prisma.photo.findUnique({ where: { id: photoId }, select: { indexStatus: true } });
      const shouldIncrementIndexed = latest?.indexStatus !== "indexed";
      await this.prisma.photo.update({
        where: { id: photoId },
        data: {
          indexStatus: "indexed",
          indexedAt: new Date(),
          faceCount,
          processingErrorCode: null,
        },
      });
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: "active", ...(shouldIncrementIndexed ? { indexedPhotos: { increment: 1 } } : {}) },
      });
      this.invalidatePeopleCache(eventId);
    } catch (error) {
      await this.prisma.photo.update({
        where: { id: photoId },
        data: {
          indexStatus: "indexed",
          indexedAt: new Date(),
          faceCount: 0,
          processingErrorCode: null,
        },
      }).catch(() => undefined);
    }
  }

  async createUploadUrl(photographerId: string, eventId: string, dto: UploadUrlRequestDto, apiBase: string, authHeader?: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");

    const photoId = randomUUID();
    const uploadUrl = `${apiBase}/v1/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}/upload-direct`;
    try {
      await this.prisma.photo.create({
        data: {
          id: photoId,
          eventId,
          fileName: dto.fileName,
          fileSizeBytes: BigInt(dto.fileSizeBytes),
          fileHash: dto.fileHash,
          mimeType: dto.contentType,
          indexStatus: "pending",
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Duplicate file already uploaded for this event");
      }
      throw error;
    }
    await this.prisma.event.update({ where: { id: eventId }, data: { totalPhotos: { increment: 1 } } });
    return {
      photoId,
      uploadUrl,
      key: "",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      requiredHeaders: {
        "Content-Type": dto.contentType,
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    };
  }

  async uploadDirect(photographerId: string, eventId: string, photoId: string, body: Buffer, contentType: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || photo.eventId !== eventId) throw new NotFoundException("Photo not found");

    // 1. Upload to local storage bucket (MinIO / Local FS)
    const stored = await this.storage.uploadPhoto(
      event.slug,
      photoId,
      photo.fileName ?? `${photoId}.jpg`,
      contentType || photo.mimeType || "image/jpeg",
      body,
    );

    const shouldIncrementIndexed = photo.indexStatus !== "indexed";
    await this.prisma.photo.update({
      where: { id: photoId },
      data: {
        s3Key: stored.key,
        s3KeyThumb: stored.thumbKey,
        driveFileId: stored.key,
        driveThumbFileId: stored.thumbKey,
        driveWebViewLink: stored.key,
        driveThumbnailLink: stored.thumbKey,
        mimeType: contentType || photo.mimeType || "image/jpeg",
        fileSizeBytes: BigInt(body.byteLength),
        indexStatus: "indexing",
        faceCount: 0,
      },
    });

    // 2. Perform fast local face indexing
    try {
      await this.getFaceIndexQueue().add(
        "face-index",
        {
          photoId,
          eventId,
          driveFileId: stored.key,
          mimeType: contentType || photo.mimeType || "image/jpeg",
        },
        { attempts: 3, removeOnComplete: true, removeOnFail: 1000 },
      );
    } catch {}

    // Inline indexing to ensure instant availability without delay
    await this.indexFacesInline(eventId, photoId, body);

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: "active",
        ...(shouldIncrementIndexed ? { indexedPhotos: { increment: 1 } } : {}),
      },
    });

    if (body.byteLength <= 8 * 1024 * 1024) {
      this.thumbCache.set(photoId, {
        body,
        contentType: contentType || photo.mimeType || "image/jpeg",
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
    }
    return { ok: true, key: stored.key };
  }

  async initMultipartUpload(photographerId: string, eventId: string, dto: MultipartUploadInitRequestDto) {
    throw new ConflictException("Multipart upload is disabled in local direct mode");
  }


  async presignMultipartParts(photographerId: string, eventId: string, photoId: string, dto: MultipartPresignPartsRequestDto) {
    throw new ConflictException("Multipart upload is disabled in Google Drive mode");
  }

  async completeMultipartUpload(photographerId: string, eventId: string, photoId: string, dto: MultipartCompleteRequestDto) {
    throw new ConflictException("Multipart upload is disabled in Google Drive mode");
  }

  async finalizeUpload(photographerId: string, eventId: string, photoIds: string[]) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");
    const uniquePhotoIds = [...new Set(photoIds.filter(Boolean))];
    if (!uniquePhotoIds.length) return { enqueued: 0, skippedDuplicates: 0, photoIds: [] };

    const photos = await this.prisma.photo.findMany({ where: { id: { in: uniquePhotoIds }, eventId } });
    if (!photos.length) throw new NotFoundException("Photo not found");

    const photoById = new Map(photos.map((photo) => [photo.id, photo]));
    let enqueued = 0;
    const enqueuedPhotoIds: string[] = [];

    for (const photoId of uniquePhotoIds) {
      const photo = photoById.get(photoId);
      if (!photo) continue;
      if (photo.indexStatus === "indexing" || photo.indexStatus === "indexed") continue;

      await this.prisma.photo.update({ where: { id: photo.id }, data: { indexStatus: "uploaded" } });
      enqueued += 1;
      enqueuedPhotoIds.push(photo.id);
    }

    if (enqueued > 0) {
      await this.prisma.event.update({ where: { id: eventId }, data: { status: "indexing" } });
    }

    return { enqueued, skippedDuplicates: uniquePhotoIds.length - enqueued, photoIds: enqueuedPhotoIds };
  }

  async status(photographerId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");
    const [total, indexed, failed, inProgress] = await Promise.all([
      this.prisma.photo.count({ where: { eventId } }),
      this.prisma.photo.count({ where: { eventId, indexStatus: "indexed" } }),
      this.prisma.photo.count({ where: { eventId, indexStatus: "failed" } }),
      this.prisma.photo.count({ where: { eventId, indexStatus: { in: ["uploaded", "indexing"] } } })
    ]);
    return { total, indexed, failed, inProgress };
  }

  async photos(photographerId: string, eventId: string, includeProcessing = false, apiBase?: string, personId?: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");
    let personPhotoIds: string[] | undefined;
    if (personId) {
      const person = await this.prisma.person.findFirst({ where: { id: personId, eventId }, select: { id: true } });
      if (!person) throw new NotFoundException("Person not found");
      const faces = await this.prisma.face.findMany({
        where: { personId },
        select: { photoId: true },
      });
      personPhotoIds = [...new Set(faces.map((f) => f.photoId))];
    }
    const photos = await this.prisma.photo.findMany({
      where: {
        eventId,
        ...(personPhotoIds ? { id: { in: personPhotoIds } } : {}),
        ...(includeProcessing ? {} : { indexStatus: "indexed" })
      },
      orderBy: { uploadedAt: "desc" },
    });
    const withUrls = await Promise.all(
      photos.map(async (photo) => {
        const statusMap = {
          pending: "pending_upload",
          uploaded: "uploaded",
          indexing: "processing",
          indexed: "ready",
          failed: "failed_processing"
        } as const;

        // Optimization: Generate URLs only once per key in this photo object
        const fullUrl = apiBase
          ? this.buildMediaUrl(apiBase, photo.id, "image")
          : (photo.driveWebViewLink || photo.driveFileId || "");
        const proxyThumbUrl = apiBase ? this.buildMediaUrl(apiBase, photo.id, "thumb") : fullUrl;
        const fileId = photo.driveThumbFileId || photo.driveFileId;
        const cdnThumb = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : null;
        const thumbSmallUrl = cdnThumb ? `${cdnThumb}=s150` : proxyThumbUrl;
        const thumbMediumUrl = cdnThumb ? `${cdnThumb}=s300` : proxyThumbUrl;
        const thumbUrl = cdnThumb ? `${cdnThumb}=s500` : proxyThumbUrl;

        return {
          id: photo.id,
          fileName: photo.fileName ?? `${photo.id}.jpg`,
          createdAt: photo.uploadedAt.toISOString(),
          uploadedAt: photo.uploadedAt.toISOString(),
          size: photo.fileSizeBytes ? Number(photo.fileSizeBytes) : undefined,
          sizeBytes: photo.fileSizeBytes ? Number(photo.fileSizeBytes) : undefined,
          status: statusMap[photo.indexStatus],
          mimeType: photo.mimeType ?? (photo.fileName?.endsWith(".png") ? "image/png" : "image/jpeg"),
          width: photo.imageWidth ?? undefined,
          height: photo.imageHeight ?? undefined,
          errorCode: photo.indexStatus === "failed" ? "FAILED_PROCESSING" : undefined,
          url: fullUrl,
          fullUrl: fullUrl,
          thumbUrl: thumbUrl,
          thumbSmallUrl: thumbSmallUrl,
          thumbMediumUrl: thumbMediumUrl
        };
      })
    );
    return withUrls;
  }

  async people(photographerId: string, eventId: string, apiBase?: string): Promise<EventPersonSummary[]> {
    if (!this.env.ENABLE_PEOPLE_STORIES) return [];
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");

    const cached = this.peopleCache.get(eventId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const people = await this.prisma.person.findMany({
      where: { eventId },
      include: {
        faces: {
          include: {
            photo: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const summaries = people
      .map((person) => {
        const uniquePhotoIds = [...new Set(person.faces.map((f) => f.photoId))];
        const coverPhoto = person.faces
          .map((f) => f.photo)
          .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
        if (!coverPhoto) return null;
        const coverThumbUrl = apiBase
          ? this.buildMediaUrl(apiBase, coverPhoto.id, "thumb")
          : (coverPhoto.driveThumbnailLink || coverPhoto.driveWebViewLink || "");
        return {
          personId: person.id,
          label: person.name || `Person`,
          faceCount: person.faces.length,
          photoCount: uniquePhotoIds.length,
          coverPhotoId: coverPhoto.id,
          coverThumbUrl,
          updatedAt: coverPhoto.uploadedAt.toISOString(),
        };
      })
      .filter((item): item is EventPersonSummary => Boolean(item))
      .sort((a, b) => b.photoCount - a.photoCount);

    this.peopleCache.set(eventId, { value: summaries, expiresAt: Date.now() + 10_000 });
    return summaries;
  }

  private withDriveThumbSize(url: string | null | undefined, size: number): string | undefined {
    if (!url) return undefined;
    try {
      if (url.includes("googleusercontent.com")) {
        if (url.includes("=") && /=s\d+$/.test(url)) {
          return url.replace(/=s\d+$/, `=s${size}`);
        }
        if (url.includes("=") && /=w\d+$/.test(url)) {
          return url.replace(/=w\d+$/, `=w${size}`);
        }
      }
      const parsed = new URL(url);
      parsed.searchParams.set("sz", `w${size}`);
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private signMediaToken(photoId: string, variant: "image" | "thumb"): string {
    const key = `${photoId}:${variant}`;
    const now = Date.now();
    const cached = this.tokenCache.get(key);
    if (cached && cached.expiresAt > now + 15 * 60 * 1000) {
      return cached.token;
    }
    const token = jwt.sign(
      { photoId, variant, typ: "media" },
      this.env.JWT_ACCESS_SECRET,
      { expiresIn: "2h" },
    );
    this.tokenCache.set(key, {
      token,
      expiresAt: now + 2 * 60 * 60 * 1000,
    });
    return token;
  }

  private verifyMediaToken(token: string, photoId: string, variant: "image" | "thumb") {
    const payload = jwt.verify(token, this.env.JWT_ACCESS_SECRET) as { photoId?: string; variant?: string; typ?: string };
    if (payload.typ !== "media" || payload.photoId !== photoId || payload.variant !== variant) {
      throw new NotFoundException("Media not found");
    }
  }

  private buildMediaUrl(apiBase: string, photoId: string, variant: "image" | "thumb") {
    const t = this.signMediaToken(photoId, variant);
    return `${apiBase}/v1/media/photos/${encodeURIComponent(photoId)}/${variant}?t=${encodeURIComponent(t)}`;
  }

  async getPhotoMedia(photoId: string, variant: "image" | "thumb", token: string) {
    this.verifyMediaToken(token, photoId, variant);
    if (variant === "thumb") {
      const cached = this.thumbCache.get(photoId);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          stream: Readable.from(cached.body),
          contentType: cached.contentType || "image/jpeg",
        };
      }
      if (cached && cached.expiresAt <= Date.now()) this.thumbCache.delete(photoId);
    }
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
    });
    if (!photo) throw new NotFoundException("Media not found");

    const storageKey =
      variant === "thumb"
        ? (photo.s3KeyThumb || photo.s3Key || photo.driveThumbnailLink || photo.driveFileId)
        : (photo.s3Key || photo.driveFileId || photo.driveWebViewLink);

    if (!storageKey) throw new NotFoundException("Media not found");

    const stream = await this.storage.getFileStream(storageKey);
    const contentType = variant === "thumb" ? "image/webp" : (photo.mimeType ?? "image/jpeg");
    return { stream, contentType };
  }

  async retry(photographerId: string, eventId: string, photoId: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId }, include: { event: true } });
    if (!photo || photo.eventId !== eventId || photo.event.photographerId !== photographerId) throw new NotFoundException("Photo not found");
    if (photo.indexStatus === "indexed") return { ok: true };
    await this.prisma.photo.update({ where: { id: photoId }, data: { indexStatus: "uploaded" } });
    return { ok: true };
  }

  async deletePhoto(photographerId: string, eventId: string, photoId: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId }, include: { event: true } });
    if (!photo || photo.eventId !== eventId || photo.event.photographerId !== photographerId) throw new NotFoundException("Photo not found");
    if (photo.s3Key) await this.storage.deleteFile(photo.s3Key).catch(() => undefined);
    if (photo.s3KeyThumb) await this.storage.deleteFile(photo.s3KeyThumb).catch(() => undefined);
    if (photo.driveFileId) await this.storage.deleteFile(photo.driveFileId).catch(() => undefined);
    const wasIndexed = photo.indexStatus === "indexed";

    await this.prisma.$transaction([
      this.prisma.photo.delete({ where: { id: photoId } }),
      this.prisma.event.update({
        where: { id: eventId },
        data: {
          totalPhotos: { decrement: 1 },
          ...(wasIndexed ? { indexedPhotos: { decrement: 1 } } : {})
        }
      })
    ]);

    // Clean up empty Person records
    await this.prisma.person.deleteMany({
      where: {
        eventId,
        faces: { none: {} },
      },
    });
    this.invalidatePeopleCache(eventId);

    return { ok: true };
  }
}

type EventPersonSummary = {
  personId: string;
  label: string;
  faceCount: number;
  photoCount: number;
  coverPhotoId: string;
  coverThumbUrl: string;
  updatedAt: string;
};
