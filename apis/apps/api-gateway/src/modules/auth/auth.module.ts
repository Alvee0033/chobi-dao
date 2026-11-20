import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../common/services/prisma.service";
import { GoogleDriveStorageService } from "../../common/services/storage.service";
import { AuthEmailService } from "./auth-email.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthEmailService, PrismaService, GoogleDriveStorageService],
  exports: [AuthService],
})
export class AuthModule {}
