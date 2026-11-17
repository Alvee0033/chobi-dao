"use client";

import { useEffect, useState } from "react";
import { isRestrictedInAppBrowser, isAndroid, isIOS, autoEscapeAndroid, copyCurrentUrl, openInSystemBrowser } from "@/lib/browser-compat";

export function InAppBrowserNotice() {
  const [showNotice, setShowNotice] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isRestrictedInAppBrowser()) {
      setShowNotice(true);
      const android = isAndroid();
      const ios = isIOS();
      setIsAndroidDevice(android);
      setIsIOSDevice(ios);

      if (android) {
        // Automatically attempt escape to Chrome on Android immediately!
        autoEscapeAndroid();
      }
    }
  }, []);

  if (!showNotice) return null;

  return (
    <aside aria-label="In-app browser notice" className="w-full max-w-xl mx-auto px-4 pt-3 pb-1 z-50">
      <div className="rounded-2xl border border-amber-300 bg-amber-50/95 backdrop-blur-md p-3.5 shadow-sm text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div className="text-xs">
            <p className="font-bold">
              {isIOSDevice ? "Facebook / Messenger limits camera on iPhone" : "In-App Browser Detected"}
            </p>
            <p className="text-amber-800 text-[11px] mt-0.5">
              {isIOSDevice 
                ? "Tap ••• in top-right → 'Open in Safari' for camera access & photo downloads."
                : "Open in Chrome for full camera and download functionality."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {isIOSDevice && (
            <button
              type="button"
              onClick={async () => {
                const ok = await copyCurrentUrl();
                if (ok) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }
                openInSystemBrowser();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-sm active:scale-95 transition-all"
            >
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          )}

          <button
            type="button"
            onClick={() => openInSystemBrowser()}
            className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-sm active:scale-95 transition-all"
          >
            {isAndroidDevice ? "Open in Chrome" : "Open in Browser"}
          </button>

          <button
            type="button"
            onClick={() => setShowNotice(false)}
            className="text-amber-700 hover:text-amber-950 text-xs font-bold px-1.5 py-1"
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
