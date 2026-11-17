"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isRestrictedInAppBrowser, openInChrome, copyCurrentUrl } from "@/lib/browser-compat";
import { Icons } from "@/components/framefind/icons";

export function EventActionButton({
  slug,
  searchEnabled,
}: {
  slug: string;
  searchEnabled: boolean;
}) {
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInAppBrowser(isRestrictedInAppBrowser());
  }, []);

  if (inAppBrowser) {
    return (
      <div className="w-full flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => openInChrome()}
          className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="21.17" y1="8" x2="12" y2="8" />
            <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
            <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
          </svg>
          <span>Open in Chrome</span>
        </button>

        <button
          type="button"
          onClick={async () => {
            const ok = await copyCurrentUrl();
            if (ok) {
              setCopied(true);
              setTimeout(() => setCopied(false), 3000);
            }
          }}
          className="text-xs font-bold text-muted/70 hover:text-charcoal transition-colors py-1 flex items-center justify-center gap-1"
        >
          {copied ? (
            <span className="text-green-600">✓ Link copied to clipboard</span>
          ) : (
            <span>Copy event link to paste in Chrome</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <Link href={searchEnabled ? `/e/${encodeURIComponent(slug)}/scan` : "#"} className="w-full">
      <button 
        type="button"
        className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        disabled={!searchEnabled}
      >
        <Icons.FaceId size={18} />
        <span>Find my photos</span>
      </button>
    </Link>
  );
}
