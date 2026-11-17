"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { me, refreshToken as apiRefreshToken } from "@/lib/api";
import type { DashboardAuthState } from "./types";
import { useRouter } from "next/navigation";

interface AuthContextType {
  auth: DashboardAuthState | null;
  isLoading: boolean;
  login: (state: DashboardAuthState) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<DashboardAuthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const resolveDriveConnected = (
      _value: { hasDriveConnected?: boolean; driveRootFolderId?: string | null },
      _fallback = false,
    ) => {
      return true; // Local server storage is always connected
    };


    const bootstrap = async () => {
      const raw = localStorage.getItem("framefind.auth");
      if (!raw) {
        setIsLoading(false);
        return;
      }

      try {
        const saved = JSON.parse(raw) as DashboardAuthState;
        // Seed saved auth immediately so dashboard renders smoothly
        setAuth(saved);
        
        // Try to verify token in background
        try {
          const profile = await me(saved.accessToken);
          const newState = {
            ...saved,
            userId: profile.id,
            email: profile.email,
            name: profile.name,
            plan: profile.plan,
            hasDriveConnected: resolveDriveConnected(profile, resolveDriveConnected(saved)),
            driveRootFolderId: profile.driveRootFolderId ?? null
          };
          setAuth(newState);
          localStorage.setItem("framefind.auth", JSON.stringify(newState));
        } catch (err) {
          // Token might be expired, try refresh
          try {
            const refreshed = await apiRefreshToken(saved.refreshToken);
            const newState: DashboardAuthState = {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              userId: refreshed.photographer.id,
              email: refreshed.photographer.email,
              name: refreshed.photographer.name,
              plan: refreshed.photographer.plan,
              hasDriveConnected: resolveDriveConnected(refreshed.photographer, resolveDriveConnected(saved)),
              driveRootFolderId: refreshed.photographer.driveRootFolderId ?? null
            };
            setAuth(newState);
            localStorage.setItem("framefind.auth", JSON.stringify(newState));
          } catch (refreshErr) {
            // Only clear auth if server explicitly returned 401/403, keep session for offline/network retry
            const isUnauthorized = refreshErr instanceof Error && (refreshErr.message.includes("401") || refreshErr.message.includes("Unauthorized"));
            if (isUnauthorized) {
              localStorage.removeItem("framefind.auth");
              setAuth(null);
            }
          }
        }
      } catch (e) {
        // Only clear if JSON parsing invalid
        localStorage.removeItem("framefind.auth");
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem("framefind.auth");
        if (!raw) return;
        const saved = JSON.parse(raw) as DashboardAuthState;
        setAuth(saved);
      } catch {
        // ignore malformed cache
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "framefind.auth") return;
      syncFromStorage();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("framefind-auth-updated", syncFromStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("framefind-auth-updated", syncFromStorage);
    };
  }, []);

  const login = (state: DashboardAuthState) => {
    setAuth(state);
    localStorage.setItem("framefind.auth", JSON.stringify(state));
    router.push("/dashboard");
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem("framefind.auth");
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ auth, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
