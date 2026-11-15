import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthRoles } from "../../common/auth/auth-role.decorator";

@Controller("v1")
@UseGuards(JwtAuthGuard)
@AuthRoles("photographer")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("analytics")
  photographerAnalytics(@Req() req: { user: { id: string } }) {
    return this.analytics.photographerAnalytics(req.user.id);
  }

  @Get("events/:id/analytics")
  analyticsView(@Req() _req: { user: { id: string } }, @Param("id") id: string) {
    return this.analytics.eventAnalytics(id);
  }
}
