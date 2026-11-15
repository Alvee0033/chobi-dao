import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { workerEnv } from "./config/env";
import { FaceIndexProcessor } from "./processors/face-index.processor";
import { ZipProcessor } from "./processors/zip.processor";

const env = workerEnv();

@Module({
  imports: [
    BullModule.forRoot({ connection: { url: env.REDIS_URL } }),
    BullModule.registerQueue({ name: "face-index" }),
    BullModule.registerQueue({ name: "zip-generation" }),
  ],
  providers: [FaceIndexProcessor, ZipProcessor]
})
export class AppModule {}
