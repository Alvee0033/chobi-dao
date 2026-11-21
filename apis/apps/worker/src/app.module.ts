import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { workerEnv } from "./config/env";
import { FaceIndexProcessor } from "./processors/face-index.processor";
import { PhotoRetentionProcessor } from "./processors/photo-retention.processor";

const env = workerEnv();

@Module({
  imports: [
    BullModule.forRoot({ connection: { url: env.REDIS_URL } }),
    BullModule.registerQueue({ name: "face-index" }),
    BullModule.registerQueue({ name: "photo-retention" }),
  ],
  providers: [FaceIndexProcessor, PhotoRetentionProcessor]
})
export class AppModule {}
