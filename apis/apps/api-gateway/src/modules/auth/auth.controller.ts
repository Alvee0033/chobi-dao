import { Body, Controller, Get, Post, Query, Redirect, Req, UseGuards } from "@nestjs/common";
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

  @Post("google/disconnect")
  @UseGuards(JwtAuthGuard)
  disconnectGoogleDrive(@Req() req: { user: { id: string; role: "photographer" | "user" } }) {
    return this.authService.disconnectGoogleDrive(req.user.id, req.user.role);
  }

  @Post("liveness-token")
  liveness(@Body() dto: LivenessTokenRequestDto) { return this.authService.createLivenessToken(dto.eventSlug, dto.challengeType); }
}
