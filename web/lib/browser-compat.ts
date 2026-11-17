/**
 * Detects Facebook, Instagram, and other restricted in-app browsers (IAB)
 * that block getUserMedia, blob downloads, etc.
 */
export function isRestrictedInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Instagram|LinkedInApp|MicroMessenger|Line\/|Snapchat|TikTok/.test(ua);
}

export function isFacebookBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|FB_IAB|FB4A|FBIOS/.test(ua);
}

/**
 * Open the current page in the system browser (Chrome/Safari).
 */
export function openInSystemBrowser(url?: string): void {
  const target = url || window.location.href;
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) {
    // Force Chrome on Android via intent scheme
    const intentUrl = `intent://${target.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
  } else {
    // iOS / Desktop: just navigate — user gets "Open in Safari" prompt on iOS
    window.location.href = target;
  }
}

/**
 * Smart download that works in Facebook IAB and all other browsers.
 * Falls back to window.open if blob downloads are blocked.
 */
export async function downloadPhoto(photoUrl: string, filename: string): Promise<void> {
  if (isRestrictedInAppBrowser()) {
    // Facebook IAB cannot do blob downloads — open image directly so user can long-press save
    window.open(photoUrl, "_blank");
    return;
  }
  try {
    const response = await fetch(photoUrl);
    if (!response.ok) throw new Error("fetch failed");
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(photoUrl, "_blank");
  }
}
