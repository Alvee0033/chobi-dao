import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";

const PLAN_LIMITS = {
  free: { photos: 200, storage: 1 * 1024 * 1024 * 1024 },
  pro: { photos: 5000, storage: 50 * 1024 * 1024 * 1024 },
  agency: { photos: 20000, storage: 500 * 1024 * 1024 * 1024 }
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async usage(photographerId: string) {
    const photographer = await this.prisma.photographer.findUnique({ where: { id: photographerId } });
    if (!photographer) throw new NotFoundException("Photographer not found");
    const agg = await this.prisma.photo.aggregate({ where: { event: { photographerId } }, _sum: { fileSizeBytes: true }, _count: { _all: true } });
    const plan = photographer.plan as keyof typeof PLAN_LIMITS;
    return {
      plan,
      photosUsed: agg._count._all,
      photosLimit: PLAN_LIMITS[plan].photos,
      storageUsedBytes: Number(agg._sum.fileSizeBytes || 0n),
      storageLimitBytes: PLAN_LIMITS[plan].storage
    };
  }

  async webhook(payload: unknown) {
    await this.prisma.invoiceCache.create({ data: { payload: JSON.stringify(payload) } });
    return { received: true };
  }
}
