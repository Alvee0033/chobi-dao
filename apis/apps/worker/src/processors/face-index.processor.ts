import { Processor, WorkerHost } from "@nestjs/bullmq";
import { PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { workerEnv } from "../config/env";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

@Processor("face-index", { concurrency: 2 })
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
    const localPath = path.resolve("./storage/uploads", key);
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

  async process(job: { data: { photoId: string; eventId: string; driveFileId: string; mimeType?: string } }) {
    const { photoId, eventId, driveFileId } = job.data;
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
    });
    if (!photo || photo.indexStatus === "indexed") return { ok: true };

    const storageKey = photo.s3Key || photo.driveFileId || driveFileId;
    if (!storageKey) return { ok: false, reason: "missing_storage_key" };

    try {
      const bytes = await this.getPhotoBytes(storageKey);
      let faceCount = 0;

      // Call local InsightFace AI Service
      const aiServiceUrl = this.env.AI_SERVICE_URL || "http://ai-service:8000";
      const formData = new FormData();
      formData.append("file", new Blob([new Uint8Array(bytes)]), "photo.jpg");

      const aiRes = await fetch(`${aiServiceUrl}/analyze`, {
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
            console.warn("Worker pgvector insert notice:", pgErr);
          }

          // Match or create person
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
            console.error("Worker clustering query error:", clusterErr);
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
        data: { indexStatus: "indexed", faceCount: 0 },
      }).catch(() => undefined);
      return { ok: true };
    }
  }
}

