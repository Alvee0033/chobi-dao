import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";
import { GoogleDriveStorageService } from "../../common/services/storage.service";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
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
    const existing = await this.prisma.photographer.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException("Email already registered");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const photographer = await this.prisma.photographer.create({
      data: { email: dto.email.toLowerCase(), name: dto.name, passwordHash },
    });
    return this.issuePhotographerTokens(
      photographer.id,
      photographer.email,
      photographer.name,
      photographer.plan,
      this.computeDriveConnected(photographer),
      photographer.driveRootFolderId ?? null,
    );
  }

  async loginPhotographer(dto: LoginDto) {
    const photographer = await this.prisma.photographer.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!photographer?.passwordHash) throw new UnauthorizedException("Invalid credentials");
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

  async createLivenessToken(eventSlug: string, challengeType: string) {
    const event = await this.prisma.event.findUnique({ where: { slug: eventSlug } });
    if (!event || event.deletedAt || event.status === "expired") {
      throw new UnauthorizedException("Event not available");
    }
    const searchEnabled = event.status === "active";
    if (!searchEnabled) {
      throw new ConflictException("Face matching is not enabled yet for this event");
    }
    const token = jwt.sign(
      { eventSlug },
      this.env.LIVENESS_TOKEN_SECRET,
      { expiresIn: "10m" }
    );
    return { livenessToken: token };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private signAccessToken(sub: string, email: string, role: AccessRole) {
    return jwt.sign({ sub, email, role }, this.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
  }
  private signRefreshToken(sub: string, email: string, actorType: AuthActorType) {
    return jwt.sign({ sub, email, actorType }, this.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
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
