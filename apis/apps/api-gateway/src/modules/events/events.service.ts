import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { ObjectStorageService } from "../../common/services/storage.service";
import slugify from "slugify";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import type { CreateEventDto, UpdateEventDto } from "@framefind/shared-contracts";
import { randomUUID } from "crypto";
import { parseEnv } from "../../config/env";

@Injectable()
export class EventsService {
  private readonly env = parseEnv();
  constructor(private readonly prisma: PrismaService, private readonly storage: ObjectStorageService) {}
  private readonly qrStyle = {
    errorCorrectionLevel: "H" as const,
    margin: 4,
    width: 640,
    color: {
      dark: "#21170F",
      light: "#FFFFFF"
    }
  };

  async list(photographerId: string) {
    const events = await this.prisma.event.findMany({ where: { photographerId, deletedAt: null }, orderBy: { createdAt: "desc" } });
    return Promise.all(events.map((event) => this.withDisplayFields(event)));
  }

  async create(photographerId: string, dto: CreateEventDto) {
    const base = slugify(dto.name, { lower: true, strict: true });
    const count = await this.prisma.event.count({ where: { slug: { startsWith: base } } });
    const slug = count ? `${base}-${count + 1}` : base;
    const passwordHash = dto.password ? dto.password : null;
    const event = await this.prisma.event.create({
      data: {
        photographerId,
        slug,
        name: dto.name,
        details: dto.details?.trim() || null,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        location: dto.location,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        passwordHash
      }
    });
    const withDisplay = await this.withDisplayFields(event);
    return {
      ...withDisplay,
      publicUrl: `/e/${event.slug}`,
      qr: await this.buildQr(event.slug)
    };
  }

  async createCoverUploadUrl(photographerId: string, eventId: string, dto: { fileName: string; contentType: string }) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(dto.contentType)) throw new BadRequestException("Unsupported cover image format");
    await this.prisma.coverUpload.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const coverToken = `cover-upload:${token}`;
    await this.prisma.coverUpload.create({
      data: { id: token, photographerId, eventId, fileName: dto.fileName, contentType: dto.contentType, expiresAt },
    });
    const uploadUrl = `/v1/events/${encodeURIComponent(eventId)}/cover-upload-direct/${encodeURIComponent(token)}`;
    return {
      key: coverToken,
      uploadUrl,
      expiresAt: expiresAt.toISOString(),
      requiredHeaders: { "Content-Type": dto.contentType }
    };
  }

  async uploadCoverDirect(photographerId: string, eventId: string, token: string, body: Buffer, contentType: string) {
    const pending = await this.prisma.coverUpload.findUnique({ where: { id: token } });
    if (!pending || pending.eventId !== eventId || pending.photographerId !== photographerId || pending.expiresAt <= new Date() || pending.resolvedKey) {
      throw new NotFoundException("Cover upload session not found");
    }
    if (body.byteLength < 1 || body.byteLength > 10 * 1024 * 1024 || contentType !== pending.contentType) {
      throw new BadRequestException("Cover upload does not match its reservation");
    }
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");

    const stored = await this.storage.uploadPhoto(
      event.slug,
      `cover-${token}`,
      pending.fileName,
      pending.contentType,
      body,
    );

    await this.prisma.$transaction([
      this.prisma.event.update({ where: { id: eventId }, data: { coverPhotoKey: stored.key, coverPhotoMimeType: pending.contentType } }),
      this.prisma.coverUpload.update({ where: { id: token }, data: { resolvedKey: stored.key } }),
    ]);
    return { ok: true, coverPhotoKey: stored.key };
  }

  async get(photographerId: string, id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");
    return this.withDisplayFields(event);
  }

  async update(photographerId: string, id: string, dto: UpdateEventDto) {
    await this.get(photographerId, id);
    let resolvedCoverPhotoKey = dto.coverPhotoKey;
    let resolvedCoverPhotoMimeType: string | undefined;
    if (resolvedCoverPhotoKey?.startsWith("cover-upload:")) {
      const token = resolvedCoverPhotoKey.slice("cover-upload:".length);
      const resolved = await this.prisma.coverUpload.findFirst({
        where: { id: token, eventId: id, photographerId, expiresAt: { gt: new Date() }, resolvedKey: { not: null } },
        select: { resolvedKey: true, contentType: true },
      });
      resolvedCoverPhotoKey = resolved?.resolvedKey ?? undefined;
      resolvedCoverPhotoMimeType = resolved?.contentType;
    }
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        name: dto.name,
        details: dto.details,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        location: dto.location,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        status: dto.status,
        coverPhotoKey: resolvedCoverPhotoKey,
        coverPhotoMimeType: resolvedCoverPhotoMimeType,
      }
    });
    return this.withDisplayFields(event);
  }

  async remove(photographerId: string, id: string) {
    await this.get(photographerId, id);
    return this.prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async qr(photographerId: string, id: string) {
    const event = await this.get(photographerId, id);
    return this.buildQr(event.slug);
  }

  async publicLanding(slug: string) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event || event.deletedAt) throw new NotFoundException("Event not found");
    if (event.status === "expired") throw new ForbiddenException("Event expired");
    return {
      name: event.name,
      slug: event.slug,
      eventDate: event.eventDate,
      location: event.location,
      searchEnabled: event.status === "active",
      consentText: "By scanning your face, you agree to one-time face comparison. No data is stored."
    };
  }

  private async withDisplayFields(event: any) {
    const thumbnailUrl = event.coverPhotoKey ? `${this.env.API_BASE_URL.replace(/\/+$/, "")}/v1/e/${event.slug}/cover` : null;
    const safeEvent = { ...event };
    delete safeEvent.passwordHash;
    return {
      ...safeEvent,
      thumbnailUrl,
      coverPhotoUrl: thumbnailUrl,
    };
  }

  private async buildQr(slug: string) {
    const url = new URL(`/e/${encodeURIComponent(slug)}`, this.env.APP_BASE_URL).toString();
    const dataUrl = await QRCode.toDataURL(url, this.qrStyle);
    const pngBase64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    return { url, pngBase64 };
  }

  private signMediaToken(photoId: string, variant: "image" | "thumb"): string {
    return jwt.sign(
      { photoId, variant, typ: "media" },
      this.env.JWT_ACCESS_SECRET,
      { expiresIn: "2h" },
    );
  }

  private buildMediaUrl(apiBase: string, photoId: string, variant: "image" | "thumb") {
    const token = this.signMediaToken(photoId, variant);
    return `${apiBase}/v1/media/photos/${encodeURIComponent(photoId)}/${variant}?t=${encodeURIComponent(token)}`;
  }

  async getPublicPersonPhotos(slug: string, personId: string, apiBase: string) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event) throw new NotFoundException("Event not found");

    const person = await this.prisma.person.findFirst({
      where: { id: personId, eventId: event.id }
    });
    if (!person) throw new NotFoundException("Person not found");

    const faces = await this.prisma.face.findMany({
      where: { personId: person.id },
      select: { photoId: true }
    });

    const photoIds = [...new Set(faces.map(f => f.photoId))];

    const photos = await this.prisma.photo.findMany({
      where: { id: { in: photoIds }, indexStatus: "indexed" },
      orderBy: { uploadedAt: "desc" }
    });

    return photos.map(photo => {
      const fullUrl = this.buildMediaUrl(apiBase, photo.id, "image");
      const thumbUrl = this.buildMediaUrl(apiBase, photo.id, "thumb");

      return {
        id: photo.id,
        thumbUrl,
        thumbSmallUrl: thumbUrl,
        thumbMediumUrl: thumbUrl,
        fullUrl,
        fileName: photo.fileName || "photo.jpg",
        similarity: 1.0
      };
    });
  }
}
