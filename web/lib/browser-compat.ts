/**
 * Detects Facebook, Instagram, Messenger, and other restricted in-app browsers (IAB)
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
 * Open the page directly in Google Chrome on both Android and iOS upon user click.
 */
export function openInChrome(url?: string): void {
  if (typeof window === "undefined") return;
  const target = url || window.location.href;
  const cleanUrl = target.replace(/^https?:\/\//, "");

  if (isAndroid()) {
    // Android: Google Chrome Intent
    const intentUrl = getAndroidChromeIntent(target);
    window.location.href = intentUrl;
  } else if (isIOS()) {
    // iOS: Google Chrome App URL Scheme
    const isHttps = target.startsWith("https");
    const chromeScheme = `${isHttps ? "googlechromes" : "googlechrome"}://${cleanUrl}`;
    window.location.href = chromeScheme;

    // Fallback if Chrome is not installed on iOS
    setTimeout(() => {
      window.location.href = target;
    }, 1200);
  } else {
    window.location.href = target;
  }
}

/**
 * Open the current page in the system browser.
 */
export function openInSystemBrowser(url?: string): void {
  openInChrome(url);
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
