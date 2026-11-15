import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { PrismaService } from "../../common/services/prisma.service";
import { ObjectStorageService } from "../../common/services/storage.service";

@Module({ controllers: [EventsController], providers: [EventsService, PrismaService, ObjectStorageService], exports: [EventsService] })
export class EventsModule {}
