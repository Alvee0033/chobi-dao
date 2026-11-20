import { Body, Controller, Get, Patch, Post, Query, Redirect, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { LivenessTokenRequestDto, LoginDto, SignupDto } from "@framefind/shared-contracts";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { parseEnv } from "../../config/env";

@Controller("v1/auth")
export class AuthController {
  private readonly env = parseEnv();
  constructor(private readonly authService: AuthService) {}

  @Post("photographer/signup")
  photographerSignup(@Body() dto: SignupDto) { return this.authService.signupPhotographer(dto); }

  @Post("photographer/login")
  photographerLogin(@Body() dto: LoginDto) { return this.authService.loginPhotographer(dto); }

  @Post("user/signup")
  userSignup(@Body() dto: SignupDto) { return this.authService.signupUser(dto); }

  @Post("user/login")
  userLogin(@Body() dto: LoginDto) { return this.authService.loginUser(dto); }

  /** Backward-compatible aliases for photographer auth. */
  @Post("signup")
  signup(@Body() dto: SignupDto) { return this.authService.signup(dto); }

  @Post("verify-email")
  verifyEmail(@Body("email") email: string, @Body("code") code: string) {
    return this.authService.verifyPhotographerEmail(email ?? "", code ?? "");
  }

  @Post("resend-verification")
  resendVerification(@Body("email") email: string) {
    return this.authService.resendPhotographerVerification(email ?? "");
  }

  @Post("login")
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post("refresh")
  refresh(@Req() req: { headers: { authorization?: string } }) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    return this.authService.refresh(token);
  }

  /**
   * Step 1: Redirect user to Google consent screen.
   * Frontend calls GET /v1/auth/google and user is redirected to Google.
   */
  @Get("google")
  @Redirect()
  googleAuth(@Query("state") state?: string) {
    const url = this.authService.getGoogleAuthUrl(state);
    return { url, statusCode: 302 };
  }

  /**
   * Step 2: Google redirects back here with ?code=...
   * Exchange code for tokens, upsert photographer, return FrameFind JWTs.
   * The frontend at APP_BASE_URL/auth/google/callback receives the tokens as JSON.
   */
  @Get("google/callback")
  @Redirect()
  async googleCallback(
    @Query("code") code: string,
    @Query("state") state?: string,
    @Query("error") error?: string,
  ) {
    const callbackBase = `${this.env.APP_BASE_URL.replace(/\/+$/, "")}/auth/google/callback`;
    if (error || !code) {
      const reason = encodeURIComponent(error ?? "google_auth_failed");
      return { url: `${callbackBase}?error=${reason}`, statusCode: 302 };
    }
    const payload = await this.authService.handleGoogleCallback(code, state);
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return { url: `${callbackBase}?payload=${encodeURIComponent(encodedPayload)}`, statusCode: 302 };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: { id: string; role: "photographer" | "user" } }) {
    return this.authService.me(req.user.id, req.user.role);
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req: { user: { id: string; role: "photographer" | "user" } }, @Body() body: { name?: string }) {
    return this.authService.updateProfile(req.user.id, req.user.role, body.name);
  }

  @Get("avatar")
  @UseGuards(JwtAuthGuard)
  async avatar(@Req() req: { user: { id: string; role: "photographer" | "user" } }, @Res() res: any) {
    const media = await this.authService.getAvatar(req.user.id, req.user.role);
    res.header("Cache-Control", "private, no-store");
    res.header("Content-Type", "image/webp");
    return res.send(media);
  }

  @Post("avatar")
  @UseGuards(JwtAuthGuard)
  uploadAvatar(@Req() req: { user: { id: string; role: "photographer" | "user" } }, @Body() body: { image?: string }) {
    return this.authService.uploadAvatar(req.user.id, req.user.role, body.image ?? "");
  }

  @Patch("notifications")
  @UseGuards(JwtAuthGuard)
  updateNotifications(@Req() req: { user: { id: string; role: "photographer" | "user" } }, @Body() body: Record<string, unknown>) {
    return this.authService.updateNotifications(req.user.id, req.user.role, body);
  }

  @Get("notifications")
  @UseGuards(JwtAuthGuard)
  getNotifications(@Req() req: { user: { id: string; role: "photographer" | "user" } }) {
    return this.authService.getNotifications(req.user.id, req.user.role);
  }

  @Post("password")
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: { user: { id: string; role: "photographer" | "user" } }, @Body() body: { currentPassword?: string; newPassword?: string }) {
    return this.authService.changePassword(req.user.id, req.user.role, body.currentPassword ?? "", body.newPassword ?? "");
  }

  @Post("email-change")
  @UseGuards(JwtAuthGuard)
  requestEmailChange(@Req() req: { user: { id: string; role: "photographer" | "user" } }, @Body() body: { newEmail?: string; currentPassword?: string }) {
    return this.authService.requestEmailChange(req.user.id, req.user.role, body.newEmail ?? "", body.currentPassword ?? "");
  }

  @Post("email-change/verify")
  @UseGuards(JwtAuthGuard)
  verifyEmailChange(@Req() req: { user: { id: string; role: "photographer" | "user" } }, @Body() body: { code?: string }) {
    return this.authService.verifyEmailChange(req.user.id, req.user.role, body.code ?? "");
  }

  @Post("google/disconnect")
  @UseGuards(JwtAuthGuard)
  disconnectGoogleDrive(@Req() req: { user: { id: string; role: "photographer" | "user" } }) {
    return this.authService.disconnectGoogleDrive(req.user.id, req.user.role);
  }

  @Post("liveness-token")
  liveness(@Body() dto: LivenessTokenRequestDto) { return this.authService.createLivenessToken(dto.eventSlug, dto.challengeType); }
}
