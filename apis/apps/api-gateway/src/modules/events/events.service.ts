import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
  private readonly pendingCoverUploads = new Map<string, { photographerId: string; eventId: string; fileName: string; contentType: string }>();
  private readonly resolvedCoverUploads = new Map<string, string>();
  constructor(private readonly prisma: PrismaService, private readonly storage: ObjectStorageService) {}
  private readonly qrStyle = {
    errorCorrectionLevel: "M" as const,
    margin: 1,
    width: 640,
    color: {
      dark: "#F97316",
      light: "#FFF8F1"
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
      qr: await this.buildQr(`/e/${event.slug}`)
    };
  }

  async createCoverUploadUrl(photographerId: string, eventId: string, dto: { fileName: string; contentType: string }) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");

    const token = randomUUID();
    const coverToken = `cover-upload:${token}`;
    this.pendingCoverUploads.set(token, {
      photographerId,
      eventId,
      fileName: dto.fileName,
      contentType: dto.contentType || "image/jpeg",
    });
    const uploadUrl = `/v1/events/${encodeURIComponent(eventId)}/cover-upload-direct/${encodeURIComponent(token)}`;
    return {
      key: coverToken,
      uploadUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      requiredHeaders: { "Content-Type": dto.contentType }
    };
  }

  async uploadCoverDirect(photographerId: string, eventId: string, token: string, body: Buffer, contentType: string) {
    const pending = this.pendingCoverUploads.get(token);
    if (!pending || pending.eventId !== eventId || pending.photographerId !== photographerId) {
      throw new NotFoundException("Cover upload session not found");
    }
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.photographerId !== photographerId || event.deletedAt) throw new NotFoundException("Event not found");

    const stored = await this.storage.uploadPhoto(
      event.slug,
      `cover-${token}`,
      pending.fileName,
      contentType || pending.contentType,
      body,
    );

    await this.prisma.event.update({ where: { id: eventId }, data: { coverPhotoKey: stored.key } });
    this.resolvedCoverUploads.set(token, stored.key);
    this.pendingCoverUploads.delete(token);
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
    if (resolvedCoverPhotoKey?.startsWith("cover-upload:")) {
      const token = resolvedCoverPhotoKey.slice("cover-upload:".length);
      resolvedCoverPhotoKey = this.resolvedCoverUploads.get(token) ?? undefined;
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
        coverPhotoKey: resolvedCoverPhotoKey
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
    return this.buildQr(`/e/${event.slug}`);
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
    return {
      ...event,
      thumbnailUrl,
      coverPhotoUrl: thumbnailUrl,
    };
  }

  private async buildQr(url: string) {
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
