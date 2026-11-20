import { BillingService } from "./billing.service";
import { UnauthorizedException } from "@nestjs/common";

const env = {
  BKASH_BASE_URL: "https://checkout.sandbox.bka.sh/v1.2.0-beta",
  BKASH_APP_KEY: "sandbox-app-key",
  BKASH_APP_SECRET: "sandbox-app-secret",
  BKASH_USERNAME: "sandbox-user",
  BKASH_PASSWORD: "sandbox-password",
  API_BASE_URL: "http://localhost:3001",
  APP_BASE_URL: "http://localhost:3000",
};

function useSandboxEnvironment() {
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
}

describe("BillingService bKash checkout", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

  it("creates a ৳399 sandbox checkout with a server callback", async () => {
    useSandboxEnvironment();
    const prisma = {
      photographer: { findUnique: jest.fn().mockResolvedValue({ id: "photographer-1234", email: "studio@example.com" }) },
      subscription: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id_token: "sandbox-id-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ paymentID: "payment-123", bkashURL: "https://sandbox-checkout.example/pay" }) });
    global.fetch = fetchMock as any;
    const service = new BillingService(prisma);

    await expect(service.startCheckout("photographer-1234")).resolves.toEqual({ checkoutUrl: "https://sandbox-checkout.example/pay", paymentId: "payment-123" });
    const createRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(createRequest).toMatchObject({ amount: "399.00", currency: "BDT", intent: "sale", callbackURL: "http://localhost:3001/v1/billing/bkash/callback" });
    expect(prisma.subscription.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "pending", providerPaymentId: "payment-123" }) }));
  });

  it("does not activate a plan when the executed amount or currency differs", async () => {
    useSandboxEnvironment();
    const attempt = { id: "sub-1", provider: "bkash", providerPaymentId: "payment-123", photographerId: "photographer-1", status: "pending" };
    const prisma = {
      subscription: { findUnique: jest.fn().mockResolvedValue(attempt), update: jest.fn().mockResolvedValue({}) },
      photographer: { update: jest.fn() },
      $transaction: jest.fn(),
    } as any;
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id_token: "sandbox-id-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ paymentID: "payment-123", transactionStatus: "Completed", amount: "1.00", currency: "BDT", trxID: "trx-1" }) }) as any;
    const service = new BillingService(prisma);

    await expect(service.completeCheckout("payment-123", "success")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.subscription.update).toHaveBeenCalledWith({ where: { id: "sub-1" }, data: { status: "failed" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("activates exactly one 30-day entitlement after verified bKash execution", async () => {
    useSandboxEnvironment();
    const attempt = { id: "sub-1", provider: "bkash", providerPaymentId: "payment-123", photographerId: "photographer-1", status: "pending" };
    const prisma = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue(attempt),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      photographer: { update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockResolvedValue([]),
    } as any;
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id_token: "sandbox-id-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ paymentID: "payment-123", transactionStatus: "Completed", amount: "399.00", currency: "BDT", trxID: "trx-1" }) }) as any;
    const service = new BillingService(prisma);

    await expect(service.completeCheckout("payment-123", "success")).resolves.toMatchObject({ ok: true, photographerId: "photographer-1" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "succeeded", transactionId: "trx-1", currentPeriodEnd: expect.any(Date) }) }));
  });
});
