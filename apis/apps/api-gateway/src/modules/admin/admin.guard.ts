import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ url: string; user?: { id?: string; role?: string; tokenVersion?: number } }>();
    if (req.user?.role !== "admin" || !req.user.id) throw new ForbiddenException("Owner access required");
    const account = await this.prisma.adminAccount.findUnique({ where: { id: req.user.id }, select: { tokenVersion: true, disabledAt: true, mustChangePassword: true } });
    if (!account || account.disabledAt || account.tokenVersion !== req.user.tokenVersion) throw new ForbiddenException("Owner access required");
    if (account.mustChangePassword && !req.url.startsWith("/v1/admin/auth/")) throw new ForbiddenException("Change your temporary password first");
    return true;
  }
}
