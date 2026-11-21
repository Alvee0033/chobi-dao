import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Prisma, PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { workerEnv } from "../config/env";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { choosePersonMatch } from "./person-match";

// Cosine similarity threshold for same-person matching.
// InsightFace 512-dim ArcFace embeddings: 0.56+ indicates same person across different angles/lighting.
const MATCH_THRESHOLD = 0.56;

@Processor("face-index", { concurrency: 4 })
export class FaceIndexProcessor extends WorkerHost {
  private readonly prisma = new PrismaClient();
  private readonly env = workerEnv();
  private readonly s3 = this.env.S3_ENDPOINT
    ? new S3Client({
        region: this.env.S3_REGION || "us-east-1",
        endpoint: this.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: this.env.S3_ACCESS_KEY_ID || "minio",
          secretAccessKey: this.env.S3_SECRET_ACCESS_KEY || "minio123",
        },
        forcePathStyle: true,
      })
    : null;

  private async getPhotoBytes(key: string): Promise<Buffer> {
    // 1. Try local disk
    const localPath = path.join(path.resolve(this.env.LOCAL_STORAGE_DIR), key);
    if (fs.existsSync(localPath)) {
      return fs.promises.readFile(localPath);
    }

    // 2. Try S3 / MinIO
    if (this.s3) {
      try {
        const res = await this.s3.send(
          new GetObjectCommand({
            Bucket: this.env.S3_BUCKET,
            Key: key,
          }),
        );
        if (res.Body) {
          const chunks: Buffer[] = [];
          for await (const chunk of res.Body as any) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          return Buffer.concat(chunks);
        }
      } catch (err) {
        console.warn(`Worker S3 fetch error for ${key}:`, err);
      }
    }

    throw new Error(`Media not found for key: ${key}`);
  }

  /**
   * Find the best matching person for a given face embedding within an event.
   * Queries top 5 candidate embeddings and picks the best scoring person.
   */
  private async findMatchingPerson(
    db: Prisma.TransactionClient,
    eventId: string,
    photoId: string,
    vectorStr: string,
  ): Promise<string | null> {
    try {
      const candidates = await db.$queryRawUnsafe<
        Array<{ person_id: string; similarity: number }>
      >(
        `SELECT f.person_id, (1 - (fe.embedding <=> $3::vector)) AS similarity
         FROM "face_embeddings" fe
         JOIN "faces" f ON f.id = fe.id::text
         WHERE fe.event_id = $1::uuid 
           AND fe.photo_id != $2::uuid
           AND f.person_id IS NOT NULL
           AND (1 - (fe.embedding <=> $3::vector)) >= $4
         ORDER BY similarity DESC
         LIMIT 5`,
        eventId,
        photoId,
        vectorStr,
        MATCH_THRESHOLD,
      );

      return choosePersonMatch(candidates, MATCH_THRESHOLD);
    } catch (clusterErr) {
      throw clusterErr;
    }
  }

  async process(job: { data: { photoId: string; eventId: string; driveFileId: string; mimeType?: string } }) {
    const { photoId, eventId, driveFileId } = job.data;
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
    });
    if (!photo || photo.indexStatus === "indexed") return { ok: true };

    const storageKey = photo.s3Key || photo.driveFileId || driveFileId;

    try {
      if (!storageKey) throw new Error(`Photo ${photoId} has no storage key`);
      await this.prisma.photo.update({ where: { id: photoId }, data: { indexStatus: "indexing", processingErrorCode: null } });
      // A retry must replace a partial attempt instead of leaving duplicate faces.
      await this.prisma.face.deleteMany({ where: { photoId } });
      await this.prisma.$executeRawUnsafe('DELETE FROM "face_embeddings" WHERE "photo_id" = $1::uuid', photoId);
      const bytes = await this.getPhotoBytes(storageKey);
      const inferenceImage = await sharp(bytes, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer();
      let faceCount = 0;

      // Call local InsightFace AI Service
      const aiServiceUrl = this.env.AI_SERVICE_URL || "http://ai-service:8000";
      const formData = new FormData();
      formData.append("file", new Blob([new Uint8Array(inferenceImage)]), "photo.jpg");

      const aiRes = await fetch(`${aiServiceUrl}/analyze`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(120_000),
      });

      if (!aiRes.ok) throw new Error(`Face analysis returned ${aiRes.status}`);
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
        for (const face of detectedFaces) {
          if (!Array.isArray(face.embedding) || face.embedding.length !== 512 || !face.embedding.every(Number.isFinite)) {
            throw new Error("Face analysis returned an invalid embedding");
          }
          const faceId = randomUUID();
          const vectorStr = `[${face.embedding.join(",")}]`;

          await this.prisma.$transaction(async (tx) => {
            // Inference remains parallel; only cluster writes serialize for this event.
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`;
            await tx.$executeRawUnsafe(
              `INSERT INTO "face_embeddings" ("id", "photo_id", "event_id", "embedding", "bbox", "det_score", "created_at")
               VALUES ($1::uuid, $2::uuid, $3::uuid, $4::vector, $5::jsonb, $6, NOW())
               ON CONFLICT ("id") DO NOTHING`,
              faceId, photoId, eventId, vectorStr, JSON.stringify(face.bbox), face.det_score ?? 0.95,
            );
            const matchedPersonId = await this.findMatchingPerson(tx, eventId, photoId, vectorStr);
            const person = matchedPersonId
              ? null
              : await tx.person.create({ data: { eventId, name: `Person ${(await tx.person.count({ where: { eventId } })) + 1}` } });
            const finalPersonId = matchedPersonId ?? person!.id;
            await tx.face.upsert({
              where: { id: faceId },
              update: {
                photoId, personId: finalPersonId,
                boundingBox: { Left: face.bbox[0], Top: face.bbox[1], Width: face.bbox[2] - face.bbox[0], Height: face.bbox[3] - face.bbox[1] },
              },
              create: {
                id: faceId, photoId, personId: finalPersonId,
                boundingBox: { Left: face.bbox[0], Top: face.bbox[1], Width: face.bbox[2] - face.bbox[0], Height: face.bbox[3] - face.bbox[1] },
              },
            });
          });
        }

      }

      await this.prisma.photo.update({
        where: { id: photoId },
        data: {
          indexStatus: "indexed",
          faceCount,
          indexedAt: new Date(),
          processingErrorCode: null,
        },
      });

      await this.prisma.event.update({
        where: { id: eventId },
        data: { indexedPhotos: { increment: 1 }, status: "active" },
      });

      return { ok: true, faceCount };
    } catch (error) {
      console.error(`Worker error indexing photo ${photoId}:`, error);
      await this.prisma.photo.update({
        where: { id: photoId },
        data: { indexStatus: "failed", faceCount: 0, processingErrorCode: "FACE_INDEX_FAILED" },
      }).catch(() => undefined);
      throw error;
    }
  }
}
