import type { SearchPhoto } from "@/lib/api";

export type AppView = "landing" | "auth" | "guest-start" | "liveness" | "gallery" | "dashboard";

export type ViewSetter = (view: AppView) => void;
export type ShowToast = (message: string) => void;

export type DashboardAuthState = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  name?: string | null;
  plan: string;
  hasDriveConnected: boolean;
  driveRootFolderId?: string | null;
};

export type GuestSearchState = {
  slug: string;
  photos: SearchPhoto[];
  sessionToken: string;
};
