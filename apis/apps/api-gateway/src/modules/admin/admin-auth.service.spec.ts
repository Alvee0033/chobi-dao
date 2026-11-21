import { UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AdminAuthService } from "./admin-auth.service";

describe("owner authentication", () => {
  const password = "temporary-owner-password";
  const account = { id: "00000000-0000-4000-8000-000000000001", email: "owner@chobidao.internal", name: "Owner", passwordHash: bcrypt.hashSync(password, 4), failedLoginAttempts: 0, lockedUntil: null, disabledAt: null, tokenVersion: 0, mustChangePassword: true };
  const prisma = { adminAccount: { findUnique: jest.fn(), update: jest.fn() } };
  const service = new AdminAuthService(prisma as any);

  beforeEach(() => { prisma.adminAccount.findUnique.mockReset().mockResolvedValue(account); prisma.adminAccount.update.mockReset().mockResolvedValue(account); });

  it("issues an owner-only token for the dedicated account", async () => {
    const result = await service.login(account.email, password);
    expect(result.owner.mustChangePassword).toBe(true);
    expect(jwt.decode(result.accessToken)).toMatchObject({ sub: account.id, role: "admin", ver: 0 });
  });

  it("locks the account after five incorrect passwords", async () => {
    prisma.adminAccount.findUnique.mockResolvedValue({ ...account, failedLoginAttempts: 4 });
    await expect(service.login(account.email, "incorrect-password")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.adminAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 5, lockedUntil: expect.any(Date) }) }));
  });

  it("replaces the bootstrap password and revokes older tokens", async () => {
    await expect(service.changePassword(account.id, password, "a-new-owner-password-2026")).resolves.toEqual({ ok: true, signInAgain: true });
    expect(prisma.adminAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ mustChangePassword: false, tokenVersion: { increment: 1 } }) }));
  });
});
