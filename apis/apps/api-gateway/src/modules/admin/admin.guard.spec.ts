import { ForbiddenException } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";

describe("AdminGuard", () => {
  const makeContext = (user: { id?: string; role?: string }) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as any;

  it("requires a verified photographer with the database admin role", async () => {
    const prisma = { photographer: { findUnique: jest.fn().mockResolvedValue({ systemRole: "admin", emailVerified: true }) } };
    const guard = new AdminGuard(prisma as any);
    await expect(guard.canActivate(makeContext({ id: "staff-id", role: "photographer" }))).resolves.toBe(true);
    expect(prisma.photographer.findUnique).toHaveBeenCalledWith({ where: { id: "staff-id" }, select: { systemRole: true, emailVerified: true } });
  });

  it("rejects non-admin and unverified accounts", async () => {
    const prisma = { photographer: { findUnique: jest.fn().mockResolvedValue({ systemRole: "photographer", emailVerified: true }) } };
    const guard = new AdminGuard(prisma as any);
    await expect(guard.canActivate(makeContext({ id: "user-id", role: "photographer" }))).rejects.toBeInstanceOf(ForbiddenException);
    prisma.photographer.findUnique.mockResolvedValue({ systemRole: "admin", emailVerified: false });
    await expect(guard.canActivate(makeContext({ id: "user-id", role: "photographer" }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(makeContext({ id: "user-id", role: "user" }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
