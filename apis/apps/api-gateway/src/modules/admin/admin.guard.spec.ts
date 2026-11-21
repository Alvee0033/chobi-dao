import { ForbiddenException } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";

describe("AdminGuard", () => {
  const makeContext = (user: { id?: string; role?: string; tokenVersion?: number }, url = "/v1/admin/overview") => ({ switchToHttp: () => ({ getRequest: () => ({ user, url }) }) }) as any;

  it("requires a current owner token backed by an active admin account", async () => {
    const prisma = { adminAccount: { findUnique: jest.fn().mockResolvedValue({ tokenVersion: 2, disabledAt: null, mustChangePassword: false }) } };
    const guard = new AdminGuard(prisma as any);
    await expect(guard.canActivate(makeContext({ id: "owner-id", role: "admin", tokenVersion: 2 }))).resolves.toBe(true);
    expect(prisma.adminAccount.findUnique).toHaveBeenCalledWith({ where: { id: "owner-id" }, select: { tokenVersion: true, disabledAt: true, mustChangePassword: true } });
  });

  it("rejects customer tokens, revoked owner tokens, and disabled accounts", async () => {
    const prisma = { adminAccount: { findUnique: jest.fn().mockResolvedValue({ tokenVersion: 2, disabledAt: null, mustChangePassword: false }) } };
    const guard = new AdminGuard(prisma as any);
    await expect(guard.canActivate(makeContext({ id: "owner-id", role: "photographer", tokenVersion: 2 }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(makeContext({ id: "owner-id", role: "admin", tokenVersion: 1 }))).rejects.toBeInstanceOf(ForbiddenException);
    prisma.adminAccount.findUnique.mockResolvedValue({ tokenVersion: 2, disabledAt: new Date(), mustChangePassword: false });
    await expect(guard.canActivate(makeContext({ id: "owner-id", role: "admin", tokenVersion: 2 }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires the temporary password to be replaced before metrics access", async () => {
    const prisma = { adminAccount: { findUnique: jest.fn().mockResolvedValue({ tokenVersion: 0, disabledAt: null, mustChangePassword: true }) } };
    const guard = new AdminGuard(prisma as any);
    const owner = { id: "owner-id", role: "admin", tokenVersion: 0 };
    await expect(guard.canActivate(makeContext(owner))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(makeContext(owner, "/v1/admin/auth/password"))).resolves.toBe(true);
  });
});
