import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

describe("AuthService email verification", () => {
  const email = "new@studio.example";
  const mockEmail = { assertConfigured: jest.fn(), sendVerificationCode: jest.fn() };
  const mockDrive = {} as any;
  let prisma: any;
  let service: AuthService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockEmail.assertConfigured.mockReset();
    mockEmail.sendVerificationCode.mockReset().mockResolvedValue(undefined);
    prisma = {
      photographer: {
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: { create: jest.fn().mockResolvedValue({}), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      event: { findUnique: jest.fn() },
      $transaction: jest.fn(async (run: any) => run({
        $queryRaw: jest.fn(),
        livenessChallenge: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({}),
        },
      })),
    };
    service = new AuthService(prisma, mockDrive, mockEmail as any);
  });

  it("creates a pending account, stores only a code hash, and sends the code", async () => {
    prisma.photographer.findUnique.mockResolvedValue(null);
    prisma.photographer.create.mockImplementation(({ data }: any) => Promise.resolve({
      id: "photographer-1", email: data.email, name: data.name, plan: "free", driveRootFolderId: null,
    }));

    await expect(service.signupPhotographer({ email, name: "New Studio", password: "strong-password" })).resolves.toEqual({ verificationRequired: true, email });

    const createData = prisma.photographer.create.mock.calls[0][0].data;
    expect(createData.emailVerified).toBe(false);
    expect(createData.emailVerificationCodeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createData.emailVerificationCodeHash).not.toBe(mockEmail.sendVerificationCode.mock.calls[0][2]);
    expect(mockEmail.sendVerificationCode.mock.calls[0][0]).toBe(email);
    expect(mockEmail.sendVerificationCode.mock.calls[0][2]).toMatch(/^\d{6}$/);
  });

  it("does not issue a session before the email is verified", async () => {
    prisma.photographer.findUnique.mockResolvedValue({ passwordHash: "hash", emailVerified: false });
    jest.spyOn(require("bcryptjs"), "compare").mockResolvedValueOnce(true as never);

    await expect(service.loginPhotographer({ email, password: "strong-password" })).rejects.toThrow("Verify your email");
  });

  it("consumes a valid code once and issues the photographer session", async () => {
    prisma.photographer.findUnique.mockResolvedValueOnce(null);
    prisma.photographer.create.mockImplementation(({ data }: any) => Promise.resolve({
      id: "photographer-1", email: data.email, name: data.name, plan: "free", driveRootFolderId: null,
    }));
    await service.signupPhotographer({ email, name: "New Studio", password: "strong-password" });
    const code = mockEmail.sendVerificationCode.mock.calls[0][2] as string;
    const stored = prisma.photographer.create.mock.calls[0][0].data;
    prisma.photographer.findUnique.mockResolvedValueOnce({
      id: "photographer-1", email, name: "New Studio", plan: "free", driveRootFolderId: null,
      emailVerified: false, emailVerificationCodeHash: stored.emailVerificationCodeHash,
      emailVerificationExpiresAt: stored.emailVerificationExpiresAt, emailVerificationAttempts: 0,
    });
    prisma.photographer.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.verifyPhotographerEmail(email, code)).resolves.toMatchObject({
      accessToken: expect.any(String), refreshToken: expect.any(String), photographer: { email },
    });
    expect(prisma.photographer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ emailVerified: true, emailVerificationCodeHash: null, emailVerificationExpiresAt: null }),
    }));
  });

  it("increments the attempt count when a submitted code is wrong", async () => {
    const expiry = new Date(Date.now() + 60_000);
    prisma.photographer.findUnique.mockResolvedValue({
      id: "photographer-1", email, emailVerified: false, emailVerificationCodeHash: "0".repeat(64),
      emailVerificationExpiresAt: expiry, emailVerificationAttempts: 0,
    });

    await expect(service.verifyPhotographerEmail(email, "000000")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.photographer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "photographer-1", emailVerified: false, emailVerificationAttempts: { lt: 5 } },
      data: { emailVerificationAttempts: { increment: 1 } },
    }));
  });

  it("issues a short-lived single-use scan challenge and persists it", async () => {
    prisma.event.findUnique.mockResolvedValue({ id: "event-1", status: "active", deletedAt: null });
    const result = await service.createLivenessToken("wedding", "127.0.0.1");
    expect(result.livenessToken).toEqual(expect.any(String));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("rate-limits scan challenge issuance per event and IP", async () => {
    prisma.event.findUnique.mockResolvedValue({ id: "event-1", status: "active", deletedAt: null });
    prisma.$transaction.mockImplementationOnce(async (run: any) => run({
      $queryRaw: jest.fn(),
      livenessChallenge: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(30),
        create: jest.fn(),
      },
    }));
    await expect(service.createLivenessToken("wedding", "127.0.0.1")).rejects.toThrow("Too many scan attempts");
  });

  it("persists only supported notification preferences", async () => {
    prisma.photographer.update.mockResolvedValue({});
    await expect(service.updateNotifications("photographer-1", "photographer", {
      eventUpdates: true, weeklySummary: "yes", productNews: false, unknownSetting: true,
    })).resolves.toEqual({ preferences: { eventUpdates: true, weeklySummary: false, productNews: false } });
    expect(prisma.photographer.update).toHaveBeenCalledWith({
      where: { id: "photographer-1" },
      data: { notificationPreferences: { eventUpdates: true, weeklySummary: false, productNews: false } },
    });
  });

  it("requires the current password and revokes refresh sessions on password update", async () => {
    prisma.photographer.findUnique.mockResolvedValue({ passwordHash: "stored-hash" });
    jest.spyOn(require("bcryptjs"), "compare").mockResolvedValueOnce(true as never);
    jest.spyOn(require("bcryptjs"), "hash").mockResolvedValueOnce("new-hash" as never);
    prisma.photographer.update.mockResolvedValue({});

    await expect(service.changePassword("photographer-1", "photographer", "current-password", "a-new-secure-password"))
      .resolves.toEqual({ ok: true, signInAgain: true });
    expect(prisma.photographer.update).toHaveBeenCalledWith({
      where: { id: "photographer-1" }, data: { passwordHash: "new-hash" },
    });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { photographerId: "photographer-1" } });
  });

  it("rejects a wrong current password without updating credentials", async () => {
    prisma.photographer.findUnique.mockResolvedValue({ passwordHash: "stored-hash" });
    jest.spyOn(require("bcryptjs"), "compare").mockResolvedValueOnce(false as never);
    await expect(service.changePassword("photographer-1", "photographer", "wrong-password", "a-new-secure-password"))
      .rejects.toThrow("Current password is incorrect");
    expect(prisma.photographer.update).not.toHaveBeenCalled();
  });
});
