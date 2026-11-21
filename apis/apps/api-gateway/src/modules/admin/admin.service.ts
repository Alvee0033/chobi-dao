import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { UploadService } from "../upload/upload.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly uploads: UploadService) {}

  private page<T extends { id: string }>(rows: T[]) {
    const hasMore = rows.length > 50;
    const items = hasMore ? rows.slice(0, 50) : rows;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null };
  }

  private validateCursor(cursor?: string) {
    if (cursor && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor)) throw new BadRequestException("Invalid cursor");
    return cursor;
  }

  async overview() {
    const now = new Date();
    const [photographers, users, events, photos, failedPhotos, activeSubscriptions, trials, pendingPayments, successfulMatches, storage, revenue] = await Promise.all([
      this.prisma.photographer.count({ where: { systemRole: "photographer" } }),
      this.prisma.appUser.count(),
      this.prisma.event.count({ where: { deletedAt: null } }),
      this.prisma.photo.count({ where: { deletedAt: null } }), this.prisma.photo.count({ where: { indexStatus: "failed", deletedAt: null } }),
      this.prisma.subscription.count({ where: { status: "succeeded", currentPeriodEnd: { gt: now } } }),
      this.prisma.photographer.count({ where: { systemRole: "photographer", trialEndsAt: { gt: now } } }),
      this.prisma.subscription.count({ where: { status: { in: ["pending", "initiated"] } } }),
      this.prisma.scanEvent.count({ where: { result: "success" } }),
      this.prisma.photo.aggregate({ where: { deletedAt: null }, _sum: { fileSizeBytes: true } }),
      this.prisma.subscription.aggregate({ where: { status: "succeeded", currency: "BDT" }, _sum: { amount: true } }),
    ]);
    return { photographers, users, events, photos, failedPhotos, activeSubscriptions, trials, pendingPayments, successfulMatches, storageBytes: Number(storage._sum.fileSizeBytes ?? 0n), revenueBdt: Number(revenue._sum.amount ?? 0) };
  }

  async users(q = "", cursor?: string) {
    cursor = this.validateCursor(cursor);
    return this.page(await this.prisma.appUser.findMany({ where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), select: { id: true, email: true, name: true, createdAt: true } }));
  }

  async accounts(q = "", cursor?: string) {
    cursor = this.validateCursor(cursor);
    return this.page(await this.prisma.photographer.findMany({ where: { systemRole: "photographer", ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), select: { id: true, email: true, name: true, plan: true, systemRole: true, trialEndsAt: true, emailVerified: true, createdAt: true, _count: { select: { events: true } } } }));
  }

  async trials(q = "", cursor?: string) {
    cursor = this.validateCursor(cursor);
    return this.page(await this.prisma.photographer.findMany({ where: { systemRole: "photographer", trialEndsAt: { gt: new Date() }, ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}) }, orderBy: [{ trialEndsAt: "asc" }, { id: "asc" }], take: 51, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), select: { id: true, email: true, name: true, plan: true, trialEndsAt: true, createdAt: true } }));
  }

  async events(q = "", cursor?: string) {
    cursor = this.validateCursor(cursor);
    return this.page(await this.prisma.event.findMany({ where: { deletedAt: null, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), select: { id: true, name: true, slug: true, status: true, totalPhotos: true, indexedPhotos: true, createdAt: true, photographer: { select: { id: true, email: true } } } }));
  }

  async subscriptions(q = "", cursor?: string) {
    cursor = this.validateCursor(cursor);
    return this.page(await this.prisma.subscription.findMany({ where: q ? { OR: [{ transactionId: { contains: q, mode: "insensitive" } }, { providerPaymentId: { contains: q, mode: "insensitive" } }, { photographer: { email: { contains: q, mode: "insensitive" } } }] } : {}, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), select: { id: true, provider: true, status: true, plan: true, amount: true, currency: true, transactionId: true, createdAt: true, currentPeriodEnd: true, photographer: { select: { id: true, email: true } } } }));
  }

  async failures(cursor?: string) {
    cursor = this.validateCursor(cursor);
    return this.page(await this.prisma.photo.findMany({ where: { indexStatus: "failed", deletedAt: null }, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), select: { id: true, eventId: true, fileName: true, processingErrorCode: true, uploadedAt: true, event: { select: { name: true, photographer: { select: { id: true, email: true } } } } } }));
  }

  async retryIndexing(adminId: string, photoId: string) {
    const photo = await this.prisma.photo.findFirst({ where: { id: photoId, deletedAt: null }, select: { id: true, eventId: true, indexStatus: true, event: { select: { photographerId: true } } } });
    if (!photo) throw new NotFoundException("Failed photo not found");
    if (photo.indexStatus === "uploaded" || photo.indexStatus === "indexing") return { ok: true, alreadyQueued: true };
    if (photo.indexStatus !== "failed") throw new NotFoundException("Failed photo not found");
    await this.uploads.retry(photo.event.photographerId, photo.eventId, photo.id);
    await this.prisma.adminAuditLog.create({ data: { adminId, action: "indexing_retry", resourceType: "photo", resourceId: photo.id, details: { eventId: photo.eventId } } });
    return { ok: true };
  }

  async audit(_adminId: string, cursor?: string) {
    cursor = this.validateCursor(cursor);
    return this.page(await this.prisma.adminAuditLog.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) }));
  }
}
