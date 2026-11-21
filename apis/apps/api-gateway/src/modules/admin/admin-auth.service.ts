import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { parseEnv } from "../../config/env";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

@Injectable()
export class AdminAuthService {
  private readonly env = parseEnv();

  constructor(private readonly prisma: PrismaService) {}

  async login(emailInput?: string, password?: string) {
    const email = emailInput?.trim().toLowerCase();
    if (!email || !password || email.length > 254 || password.length > 256) throw new UnauthorizedException("Invalid credentials");
    const account = await this.prisma.adminAccount.findUnique({ where: { email } });
    if (!account || account.disabledAt || (account.lockedUntil && account.lockedUntil > new Date())) {
      throw new UnauthorizedException("Invalid credentials or account temporarily locked");
    }
    if (!await bcrypt.compare(password, account.passwordHash)) {
      const attempts = account.failedLoginAttempts + 1;
      await this.prisma.adminAccount.update({ where: { id: account.id }, data: {
        failedLoginAttempts: attempts,
        lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
      } });
      throw new UnauthorizedException("Invalid credentials or account temporarily locked");
    }
    await this.prisma.adminAccount.update({ where: { id: account.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });
    return {
      accessToken: jwt.sign({ sub: account.id, email: account.email, role: "admin", ver: account.tokenVersion }, this.env.JWT_ACCESS_SECRET, { expiresIn: "8h" }),
      owner: { email: account.email, name: account.name, mustChangePassword: account.mustChangePassword },
    };
  }

  async me(id: string) {
    const account = await this.prisma.adminAccount.findUnique({ where: { id }, select: { email: true, name: true, mustChangePassword: true } });
    if (!account) throw new UnauthorizedException("Owner account unavailable");
    return { owner: account };
  }

  async changePassword(id: string, currentPassword?: string, newPassword?: string) {
    if (!currentPassword || !newPassword || newPassword.length < 12 || newPassword.length > 128) {
      throw new BadRequestException("Use a new password of 12 to 128 characters");
    }
    const account = await this.prisma.adminAccount.findUnique({ where: { id } });
    if (!account || !await bcrypt.compare(currentPassword, account.passwordHash)) throw new UnauthorizedException("Current password is incorrect");
    if (await bcrypt.compare(newPassword, account.passwordHash)) throw new BadRequestException("Choose a different password");
    await this.prisma.adminAccount.update({ where: { id }, data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    } });
    return { ok: true, signInAgain: true };
  }
}
