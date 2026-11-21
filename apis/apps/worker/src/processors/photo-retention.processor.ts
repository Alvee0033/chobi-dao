import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { OnModuleInit } from "@nestjs/common";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Queue, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { workerEnv } from "../config/env";
import fs from "fs/promises";
import path from "path";

@Processor("photo-retention", { concurrency: 1 })
export class PhotoRetentionProcessor extends WorkerHost implements OnModuleInit {
  private readonly prisma = new PrismaClient();
  private readonly env = workerEnv();
  private readonly s3 = this.env.S3_ENDPOINT ? new S3Client({
    region: this.env.S3_REGION,
    endpoint: this.env.S3_ENDPOINT,
    credentials: { accessKeyId: this.env.S3_ACCESS_KEY_ID || "minio", secretAccessKey: this.env.S3_SECRET_ACCESS_KEY || "minio123" },
    forcePathStyle: true,
  }) : null;

  constructor(@InjectQueue("photo-retention") private readonly queue: Queue) { super(); }

  async onModuleInit() {
    await this.queue.add("purge-expired-deletions", {}, { repeat: { every: 60 * 60 * 1000 }, jobId: "photo-retention-hourly", removeOnComplete: true, removeOnFail: 100 });
  }

  async process(_job: Job) {
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const expired = await this.prisma.photo.findMany({ where: { deletedAt: { lt: cutoff } }, orderBy: { deletedAt: "asc" }, take: 50, select: { id: true, s3Key: true, s3KeyThumb: true, driveFileId: true, driveThumbFileId: true } });
    let purged = 0;
    for (const photo of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM photos WHERE id = ${photo.id}::uuid AND deleted_at < ${cutoff} FOR UPDATE`;
          if (!locked.length) return;
          const keys = [...new Set([photo.s3Key || photo.driveFileId, photo.s3KeyThumb || photo.driveThumbFileId].filter((key): key is string => Boolean(key)))];
          for (const key of keys) await this.deleteStoredFile(key);
          await tx.photoRemovalRequest.deleteMany({ where: { photoId: photo.id } });
          await tx.photo.delete({ where: { id: photo.id } });
          purged += 1;
        });
      } catch (error) {
        console.error("Photo retention cleanup failed", { photoId: photo.id, message: error instanceof Error ? error.message : "unknown error" });
      }
    }
    return { examined: expired.length, purged };
  }

  private async deleteStoredFile(key: string) {
    const localPath = path.join(path.resolve(this.env.LOCAL_STORAGE_DIR), key);
    await fs.unlink(localPath).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    if (this.s3) await this.s3.send(new DeleteObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }));
  }
}
