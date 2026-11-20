import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { ObjectStorageService } from "../../common/services/storage.service";
import type { MultipartCompleteRequestDto, MultipartPresignPartsRequestDto, MultipartUploadInitRequestDto, UploadUrlRequestDto } from "@framefind/shared-contracts";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { parseEnv } from "../../config/env";
import { Queue } from "bullmq";

const FREE_STORAGE_BYTES = 1024 ** 3;

@Injectable()
export class UploadService {
  private readonly env = parseEnv();
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

  private async enqueueFaceIndex(photoId: string, eventId: string, storageKey: string, mimeType: string) {
    const queue = this.getFaceIndexQueue();
    const existing = await queue.getJob(photoId);
    if (existing) {
      const state = await existing.getState();
      if (state === "failed" || state === "completed") await existing.remove();
      else return;
    }
    await queue.add(
      "face-index",
      { photoId, eventId, driveFileId: storageKey, mimeType },
      { jobId: photoId, attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: true, removeOnFail: 1000 },
    );
  }

  async createUploadUrl(photographerId: string, eventId: string, dto: UploadUrlRequestDto, apiBase: string, authHeader?: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");

    const photographer = await this.prisma.photographer.findUnique({ where: { id: photographerId }, select: { plan: true, trialEndsAt: true } });
    if (!photographer) throw new NotFoundException("Photographer not found");
    const paidSubscription = await this.prisma.subscription.findFirst({
      where: { photographerId, status: "succeeded", currentPeriodEnd: { gt: new Date() } }, select: { id: true },
    });
    const pro = Boolean(paidSubscription) || photographer.trialEndsAt > new Date();
    if (!pro) {
      const [usage, photoCount] = await Promise.all([
        this.prisma.photo.aggregate({ where: { event: { photographerId } }, _sum: { fileSizeBytes: true } }),
        this.prisma.photo.count({ where: { event: { photographerId } } }),
      ]);
      if (photoCount >= 200 || Number(usage._sum.fileSizeBytes || 0n) + dto.fileSizeBytes > FREE_STORAGE_BYTES) {
        throw new HttpException("Free plan limit reached. Upgrade to Chobi Dao Pro to continue uploading.", HttpStatus.PAYMENT_REQUIRED);
      }
    } else {
      const usage = await this.prisma.photo.aggregate({ where: { event: { photographerId } }, _sum: { fileSizeBytes: true } });
      if (Number(usage._sum.fileSizeBytes || 0n) + dto.fileSizeBytes > 20 * FREE_STORAGE_BYTES) {
        throw new HttpException("Your 20 GB storage limit has been reached.", HttpStatus.PAYMENT_REQUIRED);
      }
    }

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

    if (event.status !== "active") {
      await this.prisma.event.update({ where: { id: eventId }, data: { status: "indexing" } });
    }

    try {
      await this.enqueueFaceIndex(photoId, eventId, stored.key, contentType || photo.mimeType || "image/jpeg");
    } catch (error) {
      await this.prisma.photo.update({
        where: { id: photoId },
        data: { indexStatus: "failed", processingErrorCode: "INDEX_QUEUE_UNAVAILABLE" },
      });
      throw error;
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

  private async consolidatePeople(eventId: string): Promise<void> {
    try {
      const pairs = await this.prisma.$queryRawUnsafe<
        Array<{ person_a: string; person_b: string }>
      >(
        `SELECT
           fa.person_id AS person_a,
           fb.person_id AS person_b
         FROM "face_embeddings" ea
         JOIN "faces" fa ON fa.id = ea.id::text
         JOIN "face_embeddings" eb ON eb.event_id = ea.event_id
         JOIN "faces" fb ON fb.id = eb.id::text
         WHERE ea.event_id = $1::uuid
           AND fa.person_id != fb.person_id
           AND fa.person_id IS NOT NULL
           AND fb.person_id IS NOT NULL
           AND ea.photo_id != eb.photo_id
         GROUP BY fa.person_id, fb.person_id
         HAVING AVG(1 - (ea.embedding <=> eb.embedding)) >= 0.56
           AND fa.person_id < fb.person_id
         LIMIT 25`,
        eventId,
      );

      for (const pair of pairs) {
        const [pA, pB] = await Promise.all([
          this.prisma.person.findUnique({ where: { id: pair.person_a }, include: { faces: true } }),
          this.prisma.person.findUnique({ where: { id: pair.person_b }, include: { faces: true } }),
        ]);
        if (!pA || !pB) continue;
        const targetId = pA.faces.length >= pB.faces.length ? pair.person_a : pair.person_b;
        const sourceId = targetId === pair.person_a ? pair.person_b : pair.person_a;
        await this.prisma.face.updateMany({ where: { personId: sourceId }, data: { personId: targetId } });
        await this.prisma.person.delete({ where: { id: sourceId } }).catch(() => undefined);
      }

      await this.prisma.person.deleteMany({
        where: { eventId, faces: { none: {} } }
      }).catch(() => undefined);
    } catch {
      // Best-effort consolidation
    }
  }

  async people(photographerId: string, eventId: string, apiBase?: string): Promise<EventPersonSummary[]> {
    if (!this.env.ENABLE_PEOPLE_STORIES) return [];
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");

    const cached = this.peopleCache.get(eventId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    await this.consolidatePeople(eventId);

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
      .sort((a, b) => b.photoCount - a.photoCount)
      .map((item, index) => {
        const cleanLabel = item.label && !item.label.startsWith("Person ")
          ? item.label
          : `Person ${index + 1}`;
        return { ...item, label: cleanLabel };
      });

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
    const storageKey = photo.s3Key || photo.driveFileId;
    if (!storageKey) throw new ConflictException("Photo has not been uploaded");
    await this.prisma.photo.update({ where: { id: photoId }, data: { indexStatus: "uploaded", processingErrorCode: null } });
    await this.enqueueFaceIndex(photoId, eventId, storageKey, photo.mimeType || "image/jpeg");
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
