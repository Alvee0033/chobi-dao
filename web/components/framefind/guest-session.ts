import type { SearchPhoto } from "@/lib/api";

const guestSessionKey = (slug: string) => `framefind.guest-search.${slug}`;

export type GuestSearchSession = {
  sessionToken: string;
  photos: SearchPhoto[];
  indexingCount?: number;
};

export function saveGuestSearchSession(slug: string, payload: GuestSearchSession) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(guestSessionKey(slug), JSON.stringify(payload));
}

export function loadGuestSearchSession(slug: string): GuestSearchSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(guestSessionKey(slug));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GuestSearchSession;
  } catch {
    window.sessionStorage.removeItem(guestSessionKey(slug));
    return null;
  }
}

export function clearGuestSearchSession(slug: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(guestSessionKey(slug));
}
