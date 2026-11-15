import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { parseEnv } from "../../config/env";
import { Reflector } from "@nestjs/core";
import { AUTH_ROLES_KEY, type AuthRole } from "../auth/auth-role.decorator";

type AccessTokenPayload = { sub: string; email: string; role?: AuthRole };
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException("Missing bearer token");
    try {
      const payload = jwt.verify(auth.slice(7), parseEnv().JWT_ACCESS_SECRET) as AccessTokenPayload;
      req.user = { id: payload.sub, email: payload.email, role: payload.role ?? "photographer" };
      const requiredRoles = this.reflector.getAllAndOverride<AuthRole[]>(AUTH_ROLES_KEY, [
        context.getHandler(),
        context.getClass()
      ]);
      if (requiredRoles?.length && !requiredRoles.includes(req.user.role)) {
        throw new UnauthorizedException("Insufficient role");
      }
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
