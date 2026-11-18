import { Processor, WorkerHost } from "@nestjs/bullmq";
import { PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { workerEnv } from "../config/env";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Cosine similarity threshold for same-person matching.
// InsightFace 512-dim ArcFace embeddings: 0.56+ indicates same person across different angles/lighting.
const MATCH_THRESHOLD = 0.56;
// Merge pass threshold: if two persons share avg embedding similarity above this, merge them.
const MERGE_THRESHOLD = 0.58;

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
    eventId: string,
    photoId: string,
    vectorStr: string,
  ): Promise<string | null> {
    try {
      const candidates = await this.prisma.$queryRawUnsafe<
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

      if (candidates.length === 0) return null;

      // Group by person_id and pick the person with the best average similarity
      const personScores = new Map<string, { total: number; count: number }>();
      for (const row of candidates) {
        if (!row.person_id) continue;
        const existing = personScores.get(row.person_id) ?? { total: 0, count: 0 };
        personScores.set(row.person_id, {
          total: existing.total + row.similarity,
          count: existing.count + 1,
        });
      }

      let bestPersonId: string | null = null;
      let bestAvg = 0;
      for (const [personId, scores] of personScores) {
        const avg = scores.total / scores.count;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestPersonId = personId;
        }
      }

      return bestPersonId;
    } catch (clusterErr) {
      console.error("Worker clustering query error:", clusterErr);
      return null;
    }
  }

  /**
   * Post-process merge pass: finds pairs of Persons in this event whose face
   * embeddings have high mutual similarity and merges the smaller into the larger.
   * This fixes cases where parallel uploads create duplicate Person records for
   * the same real person.
   */
  private async mergeduplicatePersons(eventId: string): Promise<void> {
    try {
      // Find Person pairs with high avg embedding similarity between their faces
      const mergeCandidates = await this.prisma.$queryRawUnsafe<
        Array<{ person_a: string; person_b: string; avg_sim: number }>
      >(
        `SELECT
           fa.person_id AS person_a,
           fb.person_id AS person_b,
           AVG(1 - (ea.embedding <=> eb.embedding)) AS avg_sim
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
         HAVING AVG(1 - (ea.embedding <=> eb.embedding)) >= $2
           AND fa.person_id < fb.person_id
         LIMIT 20`,
        eventId,
        MERGE_THRESHOLD,
      );

      for (const pair of mergeCandidates) {
        // Check both persons still exist
        const [personA, personB] = await Promise.all([
          this.prisma.person.findUnique({
            where: { id: pair.person_a },
            include: { faces: { select: { id: true } } },
          }),
          this.prisma.person.findUnique({
            where: { id: pair.person_b },
            include: { faces: { select: { id: true } } },
          }),
        ]);

        if (!personA || !personB) continue;

        // Keep the person with more faces; merge the smaller into the larger
        const keepId = personA.faces.length >= personB.faces.length ? pair.person_a : pair.person_b;
        const removeId = keepId === pair.person_a ? pair.person_b : pair.person_a;

        console.log(`Worker merge: merging Person ${removeId} into ${keepId} (sim=${pair.avg_sim.toFixed(3)})`);

        await this.prisma.face.updateMany({
          where: { personId: removeId },
          data: { personId: keepId },
        });

        await this.prisma.person.delete({ where: { id: removeId } }).catch(() => undefined);
      }
    } catch (mergeErr) {
      // Non-fatal: merge pass best-effort
      console.warn("Worker merge pass error:", mergeErr);
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
      let faceCount = 0;

      // Call local InsightFace AI Service
      const aiServiceUrl = this.env.AI_SERVICE_URL || "http://ai-service:8000";
      const formData = new FormData();
      formData.append("file", new Blob([new Uint8Array(bytes)]), "photo.jpg");

      const aiRes = await fetch(`${aiServiceUrl}/analyze`, {
        method: "POST",
        body: formData,
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
        let currentPersonCount = await this.prisma.person.count({ where: { eventId } });

        for (const face of detectedFaces) {
          if (!Array.isArray(face.embedding) || face.embedding.length !== 512 || !face.embedding.every(Number.isFinite)) {
            throw new Error("Face analysis returned an invalid embedding");
          }
          const faceId = randomUUID();
          const vectorStr = `[${face.embedding.join(",")}]`;

          // Store in face_embeddings via pgvector
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

          // Match or create person — using improved threshold & top-5 candidate scoring
          const matchedPersonId = await this.findMatchingPerson(eventId, photoId, vectorStr);

          let finalPersonId: string;
          if (!matchedPersonId) {
            currentPersonCount += 1;
            const person = await this.prisma.person.create({
              data: { eventId, name: `Person ${currentPersonCount}` },
            });
            finalPersonId = person.id;
          } else {
            finalPersonId = matchedPersonId;
          }

          await this.prisma.face.upsert({
            where: { id: faceId },
            update: {
              photoId,
              personId: finalPersonId,
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
              personId: finalPersonId,
              boundingBox: {
                Left: face.bbox[0],
                Top: face.bbox[1],
                Width: face.bbox[2] - face.bbox[0],
                Height: face.bbox[3] - face.bbox[1],
              },
            },
          });
        }

        // Run merge pass after processing all faces in this photo
        // to consolidate any duplicate Person records created by parallel indexing
        if (faceCount > 0) {
          await this.mergeduplicatePersons(eventId);
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
