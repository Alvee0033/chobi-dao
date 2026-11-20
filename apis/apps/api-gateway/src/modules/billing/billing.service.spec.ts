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
  UDDOKTAPAY_BASE_URL: "https://sandbox.uddoktapay.com/api",
};

function useSandboxEnvironment() {
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  delete process.env.UDDOKTAPAY_API_KEY;
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

    await expect(service.startCheckout("photographer-1234", "bkash")).resolves.toEqual({ checkoutUrl: "https://sandbox-checkout.example/pay", paymentId: "payment-123" });
    const createRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(createRequest).toMatchObject({ amount: "399.00", currency: "BDT", intent: "sale", callbackURL: "http://localhost:3001/v1/billing/bkash/callback" });
    expect(prisma.subscription.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "pending", providerPaymentId: "payment-123" }) }));
  });

  it("creates an UddoktaPay checkout with a bound server callback", async () => {
    useSandboxEnvironment();
    process.env.UDDOKTAPAY_API_KEY = "uddokta-test-key";
    process.env.UDDOKTAPAY_BASE_URL = "https://pay.example.test/api";
    const prisma = {
      photographer: { findUnique: jest.fn().mockResolvedValue({ id: "photographer-1234", name: "Studio Owner", email: "studio@example.com" }) },
      subscription: { create: jest.fn().mockResolvedValue({ id: "subscription-1" }), updateMany: jest.fn() },
    } as any;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true, payment_url: "https://pay.example.test/payment/checkout-1" }) });
    global.fetch = fetchMock as any;
    const service = new BillingService(prisma);

    await expect(service.startCheckout("photographer-1234", "uddoktapay")).resolves.toEqual({ checkoutUrl: "https://pay.example.test/payment/checkout-1", paymentId: "subscription-1" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://pay.example.test/api/checkout-v2");
    expect(fetchMock.mock.calls[0][1].headers["RT-UDDOKTAPAY-API-KEY"]).toBe("uddokta-test-key");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ amount: "399.00", return_type: "GET", redirect_url: "http://localhost:3001/v1/billing/uddoktapay/callback", metadata: { subscription_id: "subscription-1", photographer_id: "photographer-1234" } });
    const checkoutPayload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(checkoutPayload.cancel_url).toBe("http://localhost:3000/dashboard/billing?billing=cancelled");
    expect(checkoutPayload.cancel_url).not.toContain("subscription-1");
  });

  it("activates Pro only after UddoktaPay verifies amount, invoice, and attempt metadata", async () => {
    useSandboxEnvironment();
    process.env.UDDOKTAPAY_API_KEY = "uddokta-test-key";
    const attempt = { id: "sub-1", provider: "uddoktapay", providerPaymentId: null, photographerId: "photographer-1", status: "pending" };
    const prisma = {
      subscription: { findFirst: jest.fn().mockResolvedValueOnce(attempt).mockResolvedValueOnce(null), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      photographer: { update: jest.fn().mockResolvedValue({}) },
    } as any;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "COMPLETED", invoice_id: "invoice-1", amount: "399.00", transaction_id: "trx-1", metadata: { subscription_id: "sub-1", photographer_id: "photographer-1" } }) }) as any;
    const service = new BillingService(prisma);

    await expect(service.completeUddoktaCheckout("invoice-1")).resolves.toMatchObject({ ok: true, photographerId: "photographer-1" });
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "sub-1", status: "pending" }, data: expect.objectContaining({ providerPaymentId: "invoice-1", status: "succeeded", transactionId: "trx-1", currentPeriodEnd: expect.any(Date) }) }));
  });

  it("rejects an UddoktaPay invoice with the wrong amount before activating an account", async () => {
    useSandboxEnvironment();
    process.env.UDDOKTAPAY_API_KEY = "uddokta-test-key";
    const prisma = { subscription: { findFirst: jest.fn(), updateMany: jest.fn() }, photographer: { update: jest.fn() } } as any;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "COMPLETED", invoice_id: "invoice-1", amount: "39.00", transaction_id: "trx-1", metadata: { subscription_id: "sub-1" } }) }) as any;
    const service = new BillingService(prisma);

    await expect(service.completeUddoktaCheckout("invoice-1")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    expect(prisma.photographer.update).not.toHaveBeenCalled();
  });

  it("does not activate a plan when the executed amount or currency differs", async () => {
    useSandboxEnvironment();
    const attempt = { id: "sub-1", provider: "bkash", providerPaymentId: "payment-123", photographerId: "photographer-1", status: "pending" };
    const prisma = {
      subscription: { findFirst: jest.fn().mockResolvedValue(attempt), update: jest.fn().mockResolvedValue({}) },
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
        findFirst: jest.fn().mockResolvedValueOnce(attempt).mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      photographer: { update: jest.fn().mockResolvedValue({}) },
    } as any;
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id_token: "sandbox-id-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ paymentID: "payment-123", transactionStatus: "Completed", amount: "399.00", currency: "BDT", trxID: "trx-1" }) }) as any;
    const service = new BillingService(prisma);

    await expect(service.completeCheckout("payment-123", "success")).resolves.toMatchObject({ ok: true, photographerId: "photographer-1" });
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "sub-1", status: "pending" }, data: expect.objectContaining({ status: "succeeded", transactionId: "trx-1", currentPeriodEnd: expect.any(Date) }) }));
  });
});
