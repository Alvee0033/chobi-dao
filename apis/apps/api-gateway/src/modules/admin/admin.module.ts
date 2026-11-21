import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UploadModule } from "../upload/upload.module";
import { AdminController } from "./admin.controller";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";

@Module({ imports: [UploadModule], controllers: [AdminController], providers: [AdminService, AdminGuard, PrismaService] })
export class AdminModule {}
