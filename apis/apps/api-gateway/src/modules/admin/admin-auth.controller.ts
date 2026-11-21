import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminGuard } from "./admin.guard";
import { AdminAuthService } from "./admin-auth.service";

@Controller("v1/admin/auth")
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post("login")
  login(@Body() body: { email?: string; password?: string }) {
    return this.auth.login(body?.email, body?.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, AdminGuard)
  me(@Req() req: { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }

  @Post("password")
  @UseGuards(JwtAuthGuard, AdminGuard)
  changePassword(@Req() req: { user: { id: string } }, @Body() body: { currentPassword?: string; newPassword?: string }) {
    return this.auth.changePassword(req.user.id, body?.currentPassword, body?.newPassword);
  }
}
