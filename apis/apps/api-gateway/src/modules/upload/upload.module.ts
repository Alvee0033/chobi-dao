import { Module } from "@nestjs/common";
import { UploadController, UploadMediaController } from "./upload.controller";
import { UploadService } from "./upload.service";
import { PrismaService } from "../../common/services/prisma.service";
import { ObjectStorageService } from "../../common/services/storage.service";
@Module({ controllers: [UploadController, UploadMediaController], providers: [UploadService, PrismaService, ObjectStorageService], exports: [UploadService] })
export class UploadModule {}
