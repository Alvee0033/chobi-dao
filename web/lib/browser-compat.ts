/**
 * Detects Facebook, Instagram, and other restricted in-app browsers (IAB)
 * that block getUserMedia, blob downloads, etc.
 */
export function isRestrictedInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Instagram|LinkedInApp|MicroMessenger|Line\/|Snapchat|TikTok/i.test(ua);
}

export function isFacebookBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

/**
 * Returns the Android Intent URL to force open in Chrome with fallback.
 */
export function getAndroidChromeIntent(url?: string): string {
  if (typeof window === "undefined") return "";
  const target = url || window.location.href;
  const cleanUrl = target.replace(/^https?:\/\//, "");
  return `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(target)};end`;
}

/**
 * Automatically escape to Chrome if on Android in an in-app browser.
 * Uses sessionStorage guard to prevent redirect loops.
 */
export function autoEscapeAndroid(url?: string): boolean {
  if (typeof window === "undefined") return false;
  if (isAndroid() && isRestrictedInAppBrowser()) {
    try {
      const redirectedKey = "chobi.iab_escaped";
      if (sessionStorage.getItem(redirectedKey)) {
        return false;
      }
      sessionStorage.setItem(redirectedKey, "1");
      const intentUrl = getAndroidChromeIntent(url);
      window.location.href = intentUrl;
      return true;
    } catch (e) {
      console.warn("Auto-escape intent failed:", e);
    }
  }
  return false;
}

/**
 * Open the current page in the system browser (Chrome/Safari).
 */
export function openInSystemBrowser(url?: string): void {
  if (typeof window === "undefined") return;
  const target = url || window.location.href;
  if (isAndroid()) {
    const intentUrl = getAndroidChromeIntent(target);
    window.location.href = intentUrl;
  } else {
    // For iOS / Desktop: navigate directly or open in Safari
    window.location.href = target;
  }
}

/**
 * Safely copy current page URL to clipboard across all mobile WebViews.
 */
export async function copyCurrentUrl(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    }
    const input = document.createElement("input");
    input.value = window.location.href;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.focus();
    input.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(input);
    return successful;
  } catch {
    return false;
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
