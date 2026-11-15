export interface SignupDto { email: string; password: string; name?: string; }
export interface LoginDto { email: string; password: string; }
export type AuthActorType = "photographer" | "user";
export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  actorType: AuthActorType;
  photographer?: {
    id: string;
    email: string;
    name?: string | null;
    plan: string;
    hasDriveConnected?: boolean;
    driveRootFolderId?: string | null;
  };
  user?: { id: string; email: string; name?: string | null; };
}
export interface RefreshResponseDto { accessToken: string; }
export interface LivenessTokenRequestDto { eventSlug: string; challengeType: string; }
export interface LivenessTokenResponseDto { livenessToken: string; }
