import { Injectable, NotFoundException, ServiceUnavailableException, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { parseEnv } from "../../config/env";

const GB = 1024 ** 3;
export const PLAN_LIMITS = {
  free: { photos: 200, storage: 1 * GB, matches: 100 },
  pro: { photos: Number.POSITIVE_INFINITY, storage: 20 * GB, matches: Number.POSITIVE_INFINITY },
} as const;
const PAID_PLAN_AMOUNT = "399.00";
const PAID_PLAN_DAYS = 30;
type BkashToken = { id_token: string; expires_in?: number };
type BkashCreate = { paymentID: string; bkashURL: string; statusCode?: string; statusMessage?: string };
type BkashExecution = { paymentID: string; trxID?: string; transactionStatus?: string; amount?: string; currency?: string; statusCode?: string; statusMessage?: string };

@Injectable()
export class BillingService {
  private readonly env = parseEnv();

  constructor(private readonly prisma: PrismaService) {}

  async usage(photographerId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
      select: { id: true, plan: true, trialEndsAt: true },
    });
    if (!photographer) throw new NotFoundException("Photographer not found");
    const [agg, activeSubscription] = await Promise.all([
      this.prisma.photo.aggregate({ where: { event: { photographerId } }, _sum: { fileSizeBytes: true }, _count: { _all: true } }),
      this.prisma.subscription.findFirst({
        where: { photographerId, status: "succeeded", currentPeriodEnd: { gt: new Date() } },
        orderBy: { currentPeriodEnd: "desc" },
        select: { currentPeriodEnd: true, transactionId: true, amount: true },
      }),
    ]);
    const trialActive = !activeSubscription && photographer.trialEndsAt > new Date();
    const plan = (activeSubscription || trialActive) ? "pro" : "free";
    const limits = PLAN_LIMITS[plan];
    const since = new Date();
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);
    const matchesUsed = plan === "pro" ? 0 : await this.prisma.scanEvent.count({
      where: { event: { photographerId }, result: "success", createdAt: { gte: since } },
    });
    return {
      plan,
      trialEndsAt: photographer.trialEndsAt,
      trialDaysRemaining: trialActive ? Math.max(1, Math.ceil((photographer.trialEndsAt.getTime() - Date.now()) / 86_400_000)) : 0,
      photosUsed: agg._count._all,
      photosLimit: Number.isFinite(limits.photos) ? limits.photos : null,
      storageUsedBytes: Number(agg._sum.fileSizeBytes || 0n),
      storageLimitBytes: limits.storage,
      matchesUsed,
      matchesLimit: Number.isFinite(limits.matches) ? limits.matches : null,
      currentPeriodEnd: activeSubscription?.currentPeriodEnd ?? null,
      lastTransactionId: activeSubscription?.transactionId ?? null,
      monthlyPrice: plan === "pro" && !trialActive ? PAID_PLAN_AMOUNT : null,
    };
  }

  async startCheckout(photographerId: string) {
    this.assertBkashConfigured();
    const photographer = await this.prisma.photographer.findUnique({ where: { id: photographerId }, select: { id: true, email: true } });
    if (!photographer) throw new NotFoundException("Photographer not found");
    const callbackURL = this.env.BKASH_CALLBACK_URL || `${this.env.API_BASE_URL.replace(/\/$/, "")}/v1/billing/bkash/callback`;
    const token = await this.getToken();
    const created = await this.bkashRequest<BkashCreate>("/checkout/payment/create", token, {
      mode: "0011",
      payerReference: photographer.id.slice(0, 20),
      callbackURL,
      amount: PAID_PLAN_AMOUNT,
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: `CD-${photographer.id.slice(0, 8)}-${Date.now()}`,
    });
    if (!created.paymentID || !created.bkashURL) throw new ServiceUnavailableException(created.statusMessage || "bKash did not create a checkout");
    await this.prisma.subscription.create({
      data: {
        photographerId,
        provider: "bkash",
        providerPaymentId: created.paymentID,
        status: "pending",
        plan: "pro",
        amount: PAID_PLAN_AMOUNT,
        currency: "BDT",
      },
    });
    return { checkoutUrl: created.bkashURL, paymentId: created.paymentID };
  }

  async completeCheckout(paymentId: string, callbackStatus: string) {
    if (!paymentId || paymentId.length > 128) throw new BadRequestException("Invalid bKash payment reference");
    const attempt = await this.prisma.subscription.findUnique({ where: { providerPaymentId: paymentId } });
    if (!attempt || attempt.provider !== "bkash") throw new NotFoundException("Payment attempt not found");
    if (attempt.status === "succeeded") return { ok: true, photographerId: attempt.photographerId };
    if (callbackStatus !== "success") {
      await this.prisma.subscription.update({ where: { id: attempt.id }, data: { status: callbackStatus === "cancel" ? "cancelled" : "failed" } });
      return { ok: false, photographerId: attempt.photographerId };
    }

    const token = await this.getToken();
    const execution = await this.bkashRequest<BkashExecution>(`/checkout/payment/execute/${encodeURIComponent(paymentId)}`, token, {});
    if (
      execution.paymentID !== paymentId || execution.transactionStatus !== "Completed" ||
      Number(execution.amount) !== 399 || execution.currency !== "BDT" || !execution.trxID
    ) {
      await this.prisma.subscription.update({ where: { id: attempt.id }, data: { status: "failed" } });
      throw new UnauthorizedException("bKash payment could not be verified");
    }

    const now = new Date();
    const previous = await this.prisma.subscription.findFirst({
      where: { photographerId: attempt.photographerId, status: "succeeded", currentPeriodEnd: { gt: now } },
      orderBy: { currentPeriodEnd: "desc" }, select: { currentPeriodEnd: true },
    });
    const currentPeriodEnd = new Date(Math.max(now.getTime(), previous?.currentPeriodEnd?.getTime() ?? 0) + PAID_PLAN_DAYS * 86_400_000);
    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: attempt.id },
        data: { status: "succeeded", transactionId: execution.trxID, currentPeriodEnd },
      }),
      this.prisma.photographer.update({ where: { id: attempt.photographerId }, data: { plan: "pro" } }),
    ]);
    return { ok: true, photographerId: attempt.photographerId };
  }

  async history(photographerId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { photographerId, provider: "bkash", status: { in: ["succeeded", "failed", "cancelled"] } },
      orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, status: true, amount: true, currency: true, transactionId: true, currentPeriodEnd: true, createdAt: true },
    });
    return { payments: subscriptions };
  }

  private assertBkashConfigured() {
    if (!this.env.BKASH_APP_KEY || !this.env.BKASH_APP_SECRET || !this.env.BKASH_USERNAME || !this.env.BKASH_PASSWORD) {
      throw new ServiceUnavailableException("bKash checkout is not configured. Add merchant sandbox credentials to the API environment.");
    }
  }

  private async getToken() {
    this.assertBkashConfigured();
    const response = await fetch(`${this.env.BKASH_BASE_URL.replace(/\/$/, "")}/checkout/token/grant`, {
      method: "POST", signal: AbortSignal.timeout(30_000),
      headers: {
        "Content-Type": "application/json", Accept: "application/json",
        username: this.env.BKASH_USERNAME, password: this.env.BKASH_PASSWORD,
        "X-APP-Key": this.env.BKASH_APP_KEY,
      },
      body: JSON.stringify({ app_key: this.env.BKASH_APP_KEY, app_secret: this.env.BKASH_APP_SECRET }),
    });
    const payload = await response.json() as BkashToken & { statusMessage?: string };
    if (!response.ok || !payload.id_token) throw new ServiceUnavailableException(payload.statusMessage || "Could not authorize with bKash");
    return payload.id_token;
  }

  private async bkashRequest<T>(path: string, token: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.env.BKASH_BASE_URL.replace(/\/$/, "")}${path}`, {
      method: "POST", signal: AbortSignal.timeout(30_000),
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: token, "X-APP-Key": this.env.BKASH_APP_KEY },
      body: JSON.stringify(body),
    });
    const payload = await response.json() as T & { statusMessage?: string };
    if (!response.ok) throw new ServiceUnavailableException(payload.statusMessage || "bKash request failed");
    return payload;
  }
}
