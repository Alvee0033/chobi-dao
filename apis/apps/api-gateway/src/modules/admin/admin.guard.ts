import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user?: { id?: string; role?: string } }>();
    if (req.user?.role !== "photographer" || !req.user.id) throw new ForbiddenException("Admin access required");
    const account = await this.prisma.photographer.findUnique({ where: { id: req.user.id }, select: { systemRole: true, emailVerified: true } });
    if (!account?.emailVerified || account.systemRole !== "admin") throw new ForbiddenException("Admin access required");
    return true;
  }
}
