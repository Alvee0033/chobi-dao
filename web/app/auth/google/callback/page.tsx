"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { parseGoogleCallbackPayload } from "@/lib/api";
import type { DashboardAuthState } from "@/components/framefind/types";

function GoogleCallbackContent() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Completing Google sign-in...");

  useEffect(() => {
    const payload = params.get("payload");
    const error = params.get("error");

    if (error) {
      window.location.replace(`/auth/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!payload) {
      window.location.replace("/auth/login?error=missing_payload");
      return;
    }

    try {
      const parsed = parseGoogleCallbackPayload(payload);
      const state: DashboardAuthState = {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        userId: parsed.photographer.id,
        email: parsed.photographer.email,
        name: parsed.photographer.name,
        plan: parsed.photographer.plan,
        hasDriveConnected:
          typeof parsed.photographer.hasDriveConnected === "boolean"
            ? parsed.photographer.hasDriveConnected
            : Boolean(parsed.photographer.driveRootFolderId) || true,
        driveRootFolderId: parsed.photographer.driveRootFolderId ?? null,
      };
      window.localStorage.setItem("framefind.auth", JSON.stringify(state));
      window.dispatchEvent(new Event("framefind-auth-updated"));
      window.location.replace("/dashboard");
    } catch (e) {
      setMessage("Google sign-in payload invalid. Redirecting to login...");
      setTimeout(() => {
        window.location.replace("/auth/login?error=invalid_payload");
      }, 1200);
    }
  }, [params]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-orange-50">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-bold text-charcoal/70">{message}</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-orange-50">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-charcoal/70">Completing Google sign-in...</p>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
