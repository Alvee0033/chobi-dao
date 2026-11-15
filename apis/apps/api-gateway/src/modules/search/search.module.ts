import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { PrismaService } from "../../common/services/prisma.service";
import { ObjectStorageService } from "../../common/services/storage.service";
@Module({ controllers: [SearchController], providers: [SearchService, PrismaService, ObjectStorageService] })
export class SearchModule {}
