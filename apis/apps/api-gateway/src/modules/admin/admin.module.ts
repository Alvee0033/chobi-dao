import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UploadModule } from "../upload/upload.module";
import { AdminController } from "./admin.controller";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";

@Module({ imports: [UploadModule], controllers: [AdminController, AdminAuthController], providers: [AdminService, AdminAuthService, AdminGuard, PrismaService] })
export class AdminModule {}
