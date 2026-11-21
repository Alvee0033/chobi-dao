import { Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";

@Controller("v1/admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get("overview") overview() { return this.admin.overview(); }
  @Get("photographers") accounts(@Query("q") q?: string, @Query("cursor") cursor?: string) { return this.admin.accounts(q, cursor); }
  @Get("trials") trials(@Query("q") q?: string, @Query("cursor") cursor?: string) { return this.admin.trials(q, cursor); }
  @Get("events") events(@Query("q") q?: string, @Query("cursor") cursor?: string) { return this.admin.events(q, cursor); }
  @Get("subscriptions") subscriptions(@Query("q") q?: string, @Query("cursor") cursor?: string) { return this.admin.subscriptions(q, cursor); }
  @Get("failures") failures(@Query("cursor") cursor?: string) { return this.admin.failures(cursor); }
  @Post("failures/:photoId/retry") retry(@Req() req: { user: { id: string } }, @Param("photoId") photoId: string) { return this.admin.retryIndexing(req.user.id, photoId); }
  @Get("audit") audit(@Req() req: { user: { id: string } }, @Query("cursor") cursor?: string) { return this.admin.audit(req.user.id, cursor); }
}
