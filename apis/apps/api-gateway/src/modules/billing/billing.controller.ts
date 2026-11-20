import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthRoles } from "../../common/auth/auth-role.decorator";
import { parseEnv } from "../../config/env";

@Controller("v1/billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("usage")
  @UseGuards(JwtAuthGuard)
  @AuthRoles("photographer")
  usage(@Req() req: { user: { id: string } }) {
    return this.billing.usage(req.user.id);
  }

  @Get("payments")
  @UseGuards(JwtAuthGuard)
  @AuthRoles("photographer")
  payments(@Req() req: { user: { id: string } }) {
    return this.billing.history(req.user.id);
  }

  @Post("checkout")
  @UseGuards(JwtAuthGuard)
  @AuthRoles("photographer")
  checkout(@Req() req: { user: { id: string } }, @Body("provider") provider: string) {
    if (provider !== "bkash" && provider !== "uddoktapay") throw new BadRequestException("Unsupported payment provider");
    return this.billing.startCheckout(req.user.id, provider);
  }

  @Get("bkash/callback")
  async bkashCallback(
    @Query("paymentID") paymentId: string,
    @Query("status") status: string,
    @Res() response: any,
  ) {
    const appUrl = parseEnv().APP_BASE_URL.replace(/\/$/, "");
    try {
      const result = await this.billing.completeCheckout(paymentId, status);
      const state = result.ok ? "success" : status === "cancel" ? "cancelled" : "failed";
      return response.redirect(`${appUrl}/dashboard/billing?billing=${state}`);
    } catch {
      return response.redirect(`${appUrl}/dashboard/billing?billing=failed`);
    }
  }

  @Get("uddoktapay/callback")
  async uddoktapayCallback(@Query("invoice_id") invoiceId: string, @Res() response: any) {
    const appUrl = parseEnv().APP_BASE_URL.replace(/\/$/, "");
    try {
      const result = await this.billing.completeUddoktaCheckout(invoiceId);
      return response.redirect(`${appUrl}/dashboard/billing?billing=${result.ok ? "success" : "failed"}`);
    } catch {
      return response.redirect(`${appUrl}/dashboard/billing?billing=failed`);
    }
  }

  @Get("uddoktapay/cancel")
  uddoktapayCancel(@Res() response: any) {
    const appUrl = parseEnv().APP_BASE_URL.replace(/\/$/, "");
    return response.redirect(`${appUrl}/dashboard/billing?billing=cancelled`);
  }
}
