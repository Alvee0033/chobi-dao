"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/framefind/AuthProvider";
import { DashboardPage } from "../DashboardPage";
import { BackgroundBlobs } from "../../ui/BackgroundBlobs";
import { Toast } from "../../ui/Toast";
import type { DashboardAuthState, ViewSetter } from "../../types";

export function DashboardRoute() {
  const { auth, isLoading, login, logout } = useAuth();
  const [toastMessage, setToastMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !auth) router.replace("/auth");
  }, [auth, isLoading, router]);

  if (isLoading || !auth) {
    return <div className="min-h-screen flex items-center justify-center bg-orange-50" role="status" aria-label="Loading dashboard"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const setView: ViewSetter = (view) => {
    if (view === "landing") router.push("/");
    if (view === "auth") router.push("/auth");
  };
  const onAuth = (state: DashboardAuthState | null) => state ? login(state) : logout();

  return <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900"><BackgroundBlobs /><DashboardPage auth={auth} onAuth={onAuth} showToast={setToastMessage} setView={setView} /><Toast message={toastMessage} onClose={() => setToastMessage("")} /></div>;
}
