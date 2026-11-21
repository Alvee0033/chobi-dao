import { ConflictException, Injectable, UnauthorizedException, BadRequestException, HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { GoogleDriveStorageService } from "../../common/services/storage.service";
import { AuthEmailService } from "./auth-email.service";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import sharp from "sharp";
import { parseEnv } from "../../config/env";
import type { AuthActorType, LoginDto, SignupDto } from "@framefind/shared-contracts";

type RefreshPayload = { sub: string; email: string; actorType?: AuthActorType; role?: AuthActorType };
type AccessRole = "photographer" | "user";

@Injectable()
export class AuthService {
  private readonly env = parseEnv();
  constructor(
    private readonly prisma: PrismaService,
    private readonly driveStorage: GoogleDriveStorageService,
    private readonly authEmail: AuthEmailService,
  ) {}

  private computeDriveConnected(_photographer?: {
    googleAccessToken?: string | null;
    googleRefreshToken?: string | null;
    driveRootFolderId?: string | null;
  }): boolean {
    return true; // Local server storage bucket is always connected and ready
  }


  // ─── Email / Password Auth ────────────────────────────────────────────────

  async signupPhotographer(dto: SignupDto) {
    this.authEmail.assertConfigured();
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.photographer.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const code = this.createVerificationCode();
    const now = new Date();
    const photographer = await this.prisma.photographer.create({
      data: {
        email,
        name: dto.name,
        passwordHash,
        emailVerified: false,
        emailVerificationCodeHash: this.hashVerificationCode(email, code),
        emailVerificationExpiresAt: new Date(now.getTime() + 10 * 60_000),
        emailVerificationSentAt: now,
        emailVerificationAttempts: 0,
      },
    });
    await this.authEmail.sendVerificationCode(email, photographer.name, code);
    return { verificationRequired: true as const, email };
  }

  async loginPhotographer(dto: LoginDto) {
    const photographer = await this.prisma.photographer.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!photographer?.passwordHash) throw new UnauthorizedException("Invalid credentials");
    if (!photographer.emailVerified) throw new UnauthorizedException("Verify your email before signing in.");
    const ok = await bcrypt.compare(dto.password, photographer.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.issuePhotographerTokens(
      photographer.id,
      photographer.email,
      photographer.name,
      photographer.plan,
      this.computeDriveConnected(photographer),
      photographer.driveRootFolderId ?? null,
    );
  }

  async signupUser(dto: SignupDto) {
    const existing = await this.prisma.appUser.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException("Email already registered");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.appUser.create({ data: { email: dto.email.toLowerCase(), name: dto.name, passwordHash } });
    return this.issueUserTokens(user.id, user.email, user.name);
  }

  async loginUser(dto: LoginDto) {
    const user = await this.prisma.appUser.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user?.passwordHash) throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.issueUserTokens(user.id, user.email, user.name);
  }

  /** Backward-compat aliases */
  async signup(dto: SignupDto) { return this.signupPhotographer(dto); }
  async login(dto: LoginDto) { return this.loginPhotographer(dto); }

  async verifyPhotographerEmail(emailInput: string, codeInput: string) {
    const email = emailInput.trim().toLowerCase();
    const code = codeInput.trim();
    if (!/^\d{6}$/.test(code)) throw new BadRequestException("Enter the 6-digit code from your email.");
    const photographer = await this.prisma.photographer.findUnique({ where: { email } });
    if (!photographer || photographer.emailVerified || !photographer.emailVerificationCodeHash || !photographer.emailVerificationExpiresAt) {
      throw new UnauthorizedException("That code is invalid or expired. Request a new one and try again.");
    }
    if (photographer.emailVerificationExpiresAt <= new Date() || photographer.emailVerificationAttempts >= 5) {
      throw new UnauthorizedException("That code is invalid or expired. Request a new one and try again.");
    }
    const matches = this.constantTimeCodeMatch(email, code, photographer.emailVerificationCodeHash);
    if (!matches) {
      await this.prisma.photographer.updateMany({
        where: { id: photographer.id, emailVerified: false, emailVerificationAttempts: { lt: 5 } },
        data: { emailVerificationAttempts: { increment: 1 } },
      });
      throw new UnauthorizedException("That code is invalid or expired. Request a new one and try again.");
    }
    const consumed = await this.prisma.photographer.updateMany({
      where: {
        id: photographer.id,
        emailVerified: false,
        emailVerificationCodeHash: photographer.emailVerificationCodeHash,
        emailVerificationExpiresAt: { gt: new Date() },
        emailVerificationAttempts: { lt: 5 },
      },
      data: { emailVerified: true, emailVerificationCodeHash: null, emailVerificationExpiresAt: null, emailVerificationSentAt: null },
    });
    if (consumed.count !== 1) throw new UnauthorizedException("That code is invalid or expired. Request a new one and try again.");
    return this.issuePhotographerTokens(
      photographer.id,
      photographer.email,
      photographer.name,
      photographer.plan,
      this.computeDriveConnected(photographer),
      photographer.driveRootFolderId ?? null,
    );
  }

  async resendPhotographerVerification(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const photographer = await this.prisma.photographer.findUnique({ where: { email } });
    if (!photographer || photographer.emailVerified || !photographer.passwordHash) return { ok: true as const };
    const now = new Date();
    if (photographer.emailVerificationSentAt && now.getTime() - photographer.emailVerificationSentAt.getTime() < 60_000) {
      throw new HttpException("Wait a minute before requesting another code.", HttpStatus.TOO_MANY_REQUESTS);
    }
    this.authEmail.assertConfigured();
    const code = this.createVerificationCode();
    const updated = await this.prisma.photographer.updateMany({
      where: { id: photographer.id, emailVerified: false },
      data: {
        emailVerificationCodeHash: this.hashVerificationCode(email, code),
        emailVerificationExpiresAt: new Date(now.getTime() + 10 * 60_000),
        emailVerificationSentAt: now,
        emailVerificationAttempts: 0,
      },
    });
    if (updated.count === 1) await this.authEmail.sendVerificationCode(email, photographer.name, code);
    return { ok: true as const };
  }

  async updateProfile(id: string, role: AccessRole, nameInput?: string) {
    if (role !== "photographer") throw new UnauthorizedException("Photographer account required");
    const name = typeof nameInput === "string" ? nameInput.trim() : "";
    if (!name || name.length > 80) throw new BadRequestException("Name must be between 1 and 80 characters.");
    const photographer = await this.prisma.photographer.update({ where: { id }, data: { name }, select: { id: true, email: true, name: true } });
    return { photographer };
  }

  async updateNotifications(id: string, role: AccessRole, input: Record<string, unknown>) {
    if (role !== "photographer") throw new UnauthorizedException("Photographer account required");
    const preferences = {
      eventUpdates: input.eventUpdates === true,
      weeklySummary: input.weeklySummary === true,
      productNews: input.productNews === true,
    };
    await this.prisma.photographer.update({ where: { id }, data: { notificationPreferences: preferences } });
    return { preferences };
  }

  async getNotifications(id: string, role: AccessRole) {
    if (role !== "photographer") throw new UnauthorizedException("Photographer account required");
    const account = await this.prisma.photographer.findUnique({ where: { id }, select: { notificationPreferences: true } });
    if (!account) throw new NotFoundException("Account not found");
    const saved = account.notificationPreferences as Record<string, unknown>;
    return { preferences: {
      eventUpdates: saved?.eventUpdates !== false,
      weeklySummary: saved?.weeklySummary === true,
      productNews: saved?.productNews === true,
    } };
  }

  async uploadAvatar(id: string, role: AccessRole, image: string) {
    if (role !== "photographer") throw new UnauthorizedException("Photographer account required");
    const encoded = image.replace(/^data:image\/(?:png|jpeg|webp);base64,/, "");
    if (!encoded || encoded.length > 5_600_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new BadRequestException("Choose an image smaller than 4 MB.");
    }
    const source = Buffer.from(encoded, "base64");
    if (source.length > 4 * 1024 * 1024) throw new BadRequestException("Choose an image smaller than 4 MB.");
    let optimized: Buffer;
    try {
      optimized = await sharp(source, { limitInputPixels: 20_000_000 }).rotate().resize(512, 512, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
    } catch {
      throw new BadRequestException("That image could not be opened. Try a JPG, PNG, or WebP image.");
    }
    const key = `profiles/${id}/avatar-${Date.now()}.webp`;
    const account = await this.prisma.photographer.findUnique({ where: { id }, select: { avatarKey: true } });
    if (!account) throw new NotFoundException("Account not found");
    await this.driveStorage.putBuffer(key, optimized, "image/webp");
    await this.prisma.photographer.update({ where: { id }, data: { avatarKey: key } });
    if (account.avatarKey) await this.driveStorage.deleteFile(account.avatarKey).catch(() => undefined);
    return { ok: true };
  }

  async getAvatar(id: string, role: AccessRole) {
    if (role !== "photographer") throw new UnauthorizedException("Photographer account required");
    const account = await this.prisma.photographer.findUnique({ where: { id }, select: { avatarKey: true } });
    if (!account?.avatarKey) throw new NotFoundException("Profile photo not found");
    return this.driveStorage.getFileStream(account.avatarKey);
  }

  async changePassword(id: string, role: AccessRole, currentPassword: string, newPassword: string) {
    if (role !== "photographer") throw new UnauthorizedException("Photographer account required");
    if (newPassword.length < 10 || newPassword.length > 128) throw new BadRequestException("Use a password between 10 and 128 characters.");
    const account = await this.prisma.photographer.findUnique({ where: { id }, select: { passwordHash: true } });
    if (!account?.passwordHash || !await bcrypt.compare(currentPassword, account.passwordHash)) throw new UnauthorizedException("Current password is incorrect.");
    await this.prisma.photographer.update({ where: { id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
    await this.prisma.refreshToken.deleteMany({ where: { photographerId: id } });
    return { ok: true, signInAgain: true };
  }

  async requestEmailChange(id: string, role: AccessRole, emailInput: string, currentPassword: string) {
    if (role !== "photographer") throw new UnauthorizedException("Photographer account required");
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new BadRequestException("Enter a valid email address.");
    const account = await this.prisma.photographer.findUnique({ where: { id } });
    if (!account?.passwordHash || !await bcrypt.compare(currentPassword, account.passwordHash)) throw new UnauthorizedException("Current password is incorrect.");
    if (email === account.email) throw new BadRequestException("That is already your current email.");
    if (await this.prisma.photographer.findUnique({ where: { email } })) throw new ConflictException("That email is already in use.");
    this.authEmail.assertConfigured();
    const now = new Date();
    if (account.emailChangeSentAt && now.getTime() - account.emailChangeSentAt.getTime() < 60_000) throw new HttpException("Wait a minute before requesting another code.", HttpStatus.TOO_MANY_REQUESTS);
    const code = this.createVerificationCode();
    await this.prisma.photographer.update({ where: { id }, data: {
      pendingEmail: email,
      emailChangeCodeHash: this.hashVerificationCode(email, code),
      emailChangeExpiresAt: new Date(now.getTime() + 10 * 60_000),
      emailChangeSentAt: now,
      emailChangeAttempts: 0,
    } });
    await this.authEmail.sendVerificationCode(email, account.name, code, "email-change");
    return { ok: true, email };
  }

  async verifyEmailChange(id: string, role: AccessRole, codeInput: string) {
    if (role !== "photographer") throw new UnauthorizedException("Photographer account required");
    const code = codeInput.trim();
    if (!/^\d{6}$/.test(code)) throw new BadRequestException("Enter the 6-digit code from your email.");
    const account = await this.prisma.photographer.findUnique({ where: { id } });
    if (!account?.pendingEmail || !account.emailChangeCodeHash || !account.emailChangeExpiresAt ||
        account.emailChangeExpiresAt <= new Date() || account.emailChangeAttempts >= 5) {
      throw new UnauthorizedException("That code is invalid or expired. Request a new one and try again.");
    }
    if (!this.constantTimeCodeMatch(account.pendingEmail, code, account.emailChangeCodeHash)) {
      await this.prisma.photographer.update({ where: { id }, data: { emailChangeAttempts: { increment: 1 } } });
      throw new UnauthorizedException("That code is invalid or expired. Request a new one and try again.");
    }
    await this.prisma.photographer.update({ where: { id }, data: {
      email: account.pendingEmail, emailVerified: true, pendingEmail: null, emailChangeCodeHash: null,
      emailChangeExpiresAt: null, emailChangeSentAt: null, emailChangeAttempts: 0,
    } });
    await this.prisma.refreshToken.deleteMany({ where: { photographerId: id } });
    return { ok: true, signInAgain: true };
  }

  private createVerificationCode() { return randomInt(100_000, 1_000_000).toString(); }

  private hashVerificationCode(email: string, code: string) {
    return createHmac("sha256", this.env.JWT_REFRESH_SECRET).update(`${email}:${code}`).digest("hex");
  }

  private constantTimeCodeMatch(email: string, code: string, expectedHash: string) {
    const actual = Buffer.from(this.hashVerificationCode(email, code), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  /** Build the Google OAuth2 client from env */
  private buildOAuth2Client() {
    return new google.auth.OAuth2(
      this.env.GOOGLE_CLIENT_ID,
      this.env.GOOGLE_CLIENT_SECRET,
      this.env.GOOGLE_REDIRECT_URI,
    );
  }

  /** Generate the Google consent URL (sent to frontend for redirect) */
  getGoogleAuthUrl(state?: string): string {
    const oauth2Client = this.buildOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",          // Force consent to always get refresh_token
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/drive.file", // Only files app created — no verification needed
      ],
      state,
    });
  }

  /**
   * Handle Google OAuth callback code → exchange for tokens → upsert Photographer.
   * Also ensures the root "FrameFind" Drive folder is created on first login.
   * Returns FrameFind JWT tokens.
   */
  async handleGoogleCallback(code: string, state?: string) {
    const oauth2Client = this.buildOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token) throw new UnauthorizedException("Failed to obtain Google access token");

    oauth2Client.setCredentials(tokens);

    // Get user profile
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const { id: googleId, email, name } = userInfo.data;

    if (!email || !googleId) throw new UnauthorizedException("Google account missing email");

    // Try to decode state JWT to find active photographer
    let photographerId: string | null = null;
    if (state) {
      try {
        const decoded = jwt.verify(state, this.env.JWT_ACCESS_SECRET) as { sub: string; role: string };
        if (decoded.role === "photographer") {
          photographerId = decoded.sub;
        }
      } catch (err) {
        try {
          // OAuth consent can take long enough for access JWT expiry; use state only for account linking.
          const decoded = jwt.verify(state, this.env.JWT_ACCESS_SECRET, { ignoreExpiration: true }) as {
            sub: string;
            role?: string;
            actorType?: string;
          };
          if ((decoded.role ?? decoded.actorType) === "photographer") {
            photographerId = decoded.sub;
          }
        } catch (err2) {
          console.warn("Failed to verify state JWT:", err2);
        }
      }
    }

    // 1. Find target photographer to associate Google Drive connection
    let photographer = null;
    if (photographerId) {
      photographer = await this.prisma.photographer.findUnique({
        where: { id: photographerId },
      });
    }

    if (!photographer) {
      // Fallback: standard Google login lookup
      photographer = await this.prisma.photographer.findFirst({
        where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
      });
    }

    // 2. Prevent unique constraint violation on googleId:
    // If another photographer has this googleId, unlink them.
    if (googleId) {
      const otherWithGoogleId = await this.prisma.photographer.findUnique({
        where: { googleId },
      });
      if (otherWithGoogleId && (!photographer || otherWithGoogleId.id !== photographer.id)) {
        await this.prisma.photographer.update({
          where: { id: otherWithGoogleId.id },
          data: {
            googleId: null,
            googleAccessToken: null,
            googleRefreshToken: null,
            googleTokenExpiresAt: null,
            driveRootFolderId: null,
          },
        });
      }
    }

    const tokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    if (photographer) {
      // Update tokens
      photographer = await this.prisma.photographer.update({
        where: { id: photographer.id },
        data: {
          googleId,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token ?? photographer.googleRefreshToken,
          googleTokenExpiresAt: tokenExpiresAt,
          name: photographer.name ?? name,
        },
      });
    } else {
      // New photographer via Google
      photographer = await this.prisma.photographer.create({
        data: {
          email: email.toLowerCase(),
          name,
          googleId,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token ?? null,
          googleTokenExpiresAt: tokenExpiresAt,
        },
      });
    }

    // Ensure root FrameFind Drive folder exists (first-time setup)
    if (!photographer.driveRootFolderId) {
      try {
        const folderId = await this.driveStorage.ensureRootFolder(
          tokens.access_token,
          tokens.refresh_token ?? undefined,
        );
        await this.prisma.photographer.update({
          where: { id: photographer.id },
          data: { driveRootFolderId: folderId },
        });
        photographer = { ...photographer, driveRootFolderId: folderId };
      } catch (err) {
        // Non-fatal — folder will be created on first upload
        console.warn("Could not create Drive root folder during login:", err);
      }
    }

    return this.issuePhotographerTokens(
      photographer.id,
      photographer.email,
      photographer.name,
      photographer.plan,
      this.computeDriveConnected(photographer),
      photographer.driveRootFolderId ?? null,
    );
  }

  // ─── Token Refresh ────────────────────────────────────────────────────────

  private normalizeActorType(payload: RefreshPayload): AuthActorType {
    return payload.actorType ?? payload.role ?? "photographer";
  }

  async refresh(refreshToken: string) {
    let payload: RefreshPayload;
    try {
      payload = jwt.verify(refreshToken, this.env.JWT_REFRESH_SECRET) as RefreshPayload;
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    const actorType = this.normalizeActorType(payload);

    if (actorType === "user") {
      const validTokens = await this.prisma.userRefreshToken.findMany({
        where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      });
      const matches = await Promise.all(
        validTokens.map(async (token) => ({ token, ok: await bcrypt.compare(refreshToken, token.tokenHash) })),
      );
      const found = matches.find((m) => m.ok)?.token;
      if (!found) throw new UnauthorizedException("Invalid refresh token");
      await this.prisma.userRefreshToken.update({ where: { id: found.id }, data: { revokedAt: new Date() } });
      const user = await this.prisma.appUser.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException("Invalid refresh token");
      return this.issueUserTokens(user.id, user.email, user.name);
    }

    const validTokens = await this.prisma.refreshToken.findMany({
      where: { photographerId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    const matches = await Promise.all(
      validTokens.map(async (token) => ({ token, ok: await bcrypt.compare(refreshToken, token.tokenHash) })),
    );
    const found = matches.find((m) => m.ok)?.token;
    if (!found) throw new UnauthorizedException("Invalid refresh token");
    await this.prisma.refreshToken.update({ where: { id: found.id }, data: { revokedAt: new Date() } });
    const photographer = await this.prisma.photographer.findUnique({ where: { id: payload.sub } });
    if (!photographer) throw new UnauthorizedException("Invalid refresh token");
    return this.issuePhotographerTokens(
      photographer.id,
      photographer.email,
      photographer.name,
      photographer.plan,
      this.computeDriveConnected(photographer),
      photographer.driveRootFolderId ?? null,
    );
  }

  // ─── Me / Session ─────────────────────────────────────────────────────────

  async me(id: string, role: AccessRole) {
    if (role === "user") {
      const user = await this.prisma.appUser.findUnique({ where: { id } });
      if (!user) throw new UnauthorizedException("Invalid user");
      return { actorType: "user", user: { id: user.id, email: user.email, name: user.name } };
    }
    const photographer = await this.prisma.photographer.findUnique({ where: { id } });
    if (!photographer) throw new UnauthorizedException("Invalid user");
    return {
      actorType: "photographer",
      photographer: {
        id: photographer.id,
        email: photographer.email,
        name: photographer.name,
        plan: photographer.plan,
        notificationPreferences: photographer.notificationPreferences,
        hasAvatar: Boolean(photographer.avatarKey),
        hasDriveConnected: this.computeDriveConnected(photographer),
        driveRootFolderId: photographer.driveRootFolderId,
      },
    };
  }

  async disconnectGoogleDrive(id: string, role: AccessRole) {
    if (role !== "photographer") throw new UnauthorizedException("Photographer account required");
    await this.prisma.photographer.update({
      where: { id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
        driveRootFolderId: null,
      },
    });
    return { ok: true };
  }

  async createLivenessToken(eventSlug: string, clientIp: string) {
    const event = await this.prisma.event.findUnique({ where: { slug: eventSlug } });
    if (!event || event.deletedAt || event.status === "expired") {
      throw new UnauthorizedException("Event not available");
    }
    const searchEnabled = event.status === "active";
    if (!searchEnabled) {
      throw new ConflictException("Face matching is not enabled yet for this event");
    }
    const now = new Date();
    const ipHash = createHmac("sha256", this.env.SEARCH_SESSION_SECRET).update(clientIp || "unknown").digest("hex");
    const challengeId = randomUUID();
    const expiresAt = new Date(now.getTime() + 2 * 60_000);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${ipHash}:${event.id}`}))`;
      await tx.livenessChallenge.deleteMany({ where: { expiresAt: { lte: now } } });
      const recentChallenges = await tx.livenessChallenge.count({
        where: { ipHash, eventId: event.id, createdAt: { gt: new Date(now.getTime() - 60_000) } },
      });
      if (recentChallenges >= 30) {
        throw new HttpException("Too many scan attempts. Please wait a minute and try again.", HttpStatus.TOO_MANY_REQUESTS);
      }
      await tx.livenessChallenge.create({ data: { id: challengeId, eventId: event.id, ipHash, expiresAt } });
    });
    const token = jwt.sign(
      { eventSlug, jti: challengeId },
      this.env.LIVENESS_TOKEN_SECRET,
      { expiresIn: "2m" }
    );
    return { livenessToken: token };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private signAccessToken(sub: string, email: string, role: AccessRole) {
    return jwt.sign({ sub, email, role }, this.env.JWT_ACCESS_SECRET, { expiresIn: "7d" });
  }
  private signRefreshToken(sub: string, email: string, actorType: AuthActorType) {
    return jwt.sign({ sub, email, actorType }, this.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
  }

  private async issuePhotographerTokens(
    id: string,
    email: string,
    name: string | null,
    plan: string,
    hasDriveConnected: boolean,
    driveRootFolderId: string | null,
  ) {
    const accessToken = this.signAccessToken(id, email, "photographer");
    const refreshToken = this.signRefreshToken(id, email, "photographer");
    await this.prisma.refreshToken.create({
      data: {
        photographerId: id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    return {
      accessToken,
      refreshToken,
      actorType: "photographer" as const,
      photographer: { id, email, name, plan, hasDriveConnected, driveRootFolderId },
    };
  }

  private async issueUserTokens(id: string, email: string, name: string | null) {
    const accessToken = this.signAccessToken(id, email, "user");
    const refreshToken = this.signRefreshToken(id, email, "user");
    await this.prisma.userRefreshToken.create({
      data: {
        userId: id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    return { accessToken, refreshToken, actorType: "user" as const, user: { id, email, name } };
  }
}
