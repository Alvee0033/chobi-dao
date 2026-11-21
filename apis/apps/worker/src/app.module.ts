import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { workerEnv } from "./config/env";
import { FaceIndexProcessor } from "./processors/face-index.processor";

const env = workerEnv();

@Module({
  imports: [
    BullModule.forRoot({ connection: { url: env.REDIS_URL } }),
    BullModule.registerQueue({ name: "face-index" }),
  ],
  providers: [FaceIndexProcessor]
})
export class AppModule {}
