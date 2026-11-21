import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, Res, UseGuards } from "@nestjs/common";
import { EventsService } from "./events.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { CreateEventDto, UpdateEventDto } from "@framefind/shared-contracts";
import { AuthRoles } from "../../common/auth/auth-role.decorator";
import { PrismaService } from "../../common/services/prisma.service";
import { ObjectStorageService } from "../../common/services/storage.service";

@Controller("v1")
@AuthRoles("photographer")
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  @Get("events") @UseGuards(JwtAuthGuard)
  list(@Req() req: { user: { id: string } }) { return this.events.list(req.user.id); }

  @Get("photographer/notifications") @UseGuards(JwtAuthGuard)
  notifications(@Req() req: { user: { id: string } }) { return this.events.notifications(req.user.id); }

  @Post("events") @UseGuards(JwtAuthGuard)
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateEventDto) { return this.events.create(req.user.id, dto); }

  @Get("events/:id") @UseGuards(JwtAuthGuard)
  get(@Req() req: { user: { id: string } }, @Param("id") id: string) { return this.events.get(req.user.id, id); }

  @Patch("events/:id") @UseGuards(JwtAuthGuard)
  update(@Req() req: { user: { id: string } }, @Param("id") id: string, @Body() dto: UpdateEventDto) { return this.events.update(req.user.id, id, dto); }

  @Post("events/:id/cover-upload-url") @UseGuards(JwtAuthGuard)
  coverUploadUrl(
    @Req() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() dto: { fileName: string; contentType: string }
  ) {
    return this.events.createCoverUploadUrl(req.user.id, id, dto);
  }

  @Put("events/:id/cover-upload-direct/:token") @UseGuards(JwtAuthGuard)
  async coverUploadDirect(
    @Req() req: { user: { id: string }; headers: { "content-type"?: string }; body?: Buffer },
    @Param("id") id: string,
    @Param("token") token: string,
  ) {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const contentType = req.headers["content-type"] ?? "application/octet-stream";
    return this.events.uploadCoverDirect(req.user.id, id, token, body, contentType);
  }

  @Delete("events/:id") @UseGuards(JwtAuthGuard)
  remove(@Req() req: { user: { id: string } }, @Param("id") id: string) { return this.events.remove(req.user.id, id); }

  @Get("events/:id/qr") @UseGuards(JwtAuthGuard)
  qr(@Req() req: { user: { id: string } }, @Param("id") id: string) { return this.events.qr(req.user.id, id); }

  @Get("e/:slug")
  landing(@Param("slug") slug: string) { return this.events.publicLanding(slug); }

  @Get("e/:slug/cover")
  async cover(@Param("slug") slug: string, @Res() res: any) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event?.coverPhotoKey) return res.code(404).send({ message: "Cover not found" });
    const stream = await this.storage.getFileStream(event.coverPhotoKey);
    res.header("Cache-Control", "public, max-age=3600");
    res.header("Content-Type", event.coverPhotoMimeType ?? "image/jpeg");
    return res.send(stream as any);
  }

  @Get("e/:slug/people/:personId/photos")
  async publicPersonPhotos(
    @Req() req: { headers: { host?: string; "x-forwarded-proto"?: string } },
    @Param("slug") slug: string,
    @Param("personId") personId: string,
  ) {
    const proto = req.headers["x-forwarded-proto"] ?? "http";
    const host = req.headers.host ?? "localhost:3001";
    const apiBase = `${proto}://${host}`;
    return this.events.getPublicPersonPhotos(slug, personId, apiBase);
  }
}
