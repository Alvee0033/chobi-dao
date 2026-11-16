import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";

async function main() {
  const prisma = new PrismaClient();
  const queue = new Queue("face-index", {
    connection: { url: process.env.REDIS_URL || "redis://localhost:6379", maxRetriesPerRequest: null },
  });
  const apply = process.argv.includes("--apply");
  let cursor: string | undefined;
  let inspected = 0;
  let missing = 0;
  let noFacePhotos = 0;
  let queued = 0;

  try {
    while (true) {
      const photos = await prisma.photo.findMany({
        where: { indexStatus: "indexed", ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: "asc" },
        take: 200,
        select: {
          id: true,
          eventId: true,
          s3Key: true,
          driveFileId: true,
          mimeType: true,
          faceCount: true,
          _count: { select: { faceEmbeddings: true } },
        },
      });
      if (!photos.length) break;
      cursor = photos[photos.length - 1].id;
      for (const photo of photos) {
        inspected += 1;
        if (photo.faceCount === 0 && photo._count.faceEmbeddings === 0) {
          noFacePhotos += 1;
          continue;
        }
        if (photo.faceCount === photo._count.faceEmbeddings) continue;
        missing += 1;
        if (!apply) continue;
        const storageKey = photo.s3Key || photo.driveFileId;
        if (!storageKey) continue;
        await prisma.$transaction([
          prisma.photo.update({ where: { id: photo.id }, data: { indexStatus: "uploaded", processingErrorCode: "REINDEX_REQUESTED" } }),
          prisma.event.update({ where: { id: photo.eventId }, data: { indexedPhotos: { decrement: 1 } } }),
        ]);
        try {
          const existing = await queue.getJob(photo.id);
          if (existing) {
            const state = await existing.getState();
            if (state === "failed" || state === "completed") await existing.remove();
            else continue;
          }
          await queue.add(
            "face-index",
            { photoId: photo.id, eventId: photo.eventId, driveFileId: storageKey, mimeType: photo.mimeType || "image/jpeg" },
            { jobId: photo.id, attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: true, removeOnFail: 1000 },
          );
        } catch (error) {
          await prisma.photo.update({ where: { id: photo.id }, data: { indexStatus: "failed", processingErrorCode: "INDEX_QUEUE_UNAVAILABLE" } });
          throw error;
        }
        queued += 1;
      }
    }
    const [photoStatuses, queueStatuses] = await Promise.all([
      prisma.photo.groupBy({ by: ["indexStatus"], _count: { id: true } }),
      queue.getJobCounts("waiting", "active", "delayed", "failed"),
    ]);
    console.log(JSON.stringify({ inspected, missing, noFacePhotos, queued, dryRun: !apply, photoStatuses, queueStatuses }));
  } finally {
    await queue.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Reindex audit failed:", error);
  process.exitCode = 1;
});
