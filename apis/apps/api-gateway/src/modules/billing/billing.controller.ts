import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthRoles } from "../../common/auth/auth-role.decorator";

@Controller("v1/billing")
@AuthRoles("photographer")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("usage")
  @UseGuards(JwtAuthGuard)
  usage(@Req() req: { user: { id: string } }) {
    return this.billing.usage(req.user.id);
  }

  @Post("webhook")
  webhook(@Body() payload: unknown) {
    return this.billing.webhook(payload);
  }
}
