"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/framefind/AuthProvider";
import { Toast } from "../../ui/Toast";
import type { DashboardAuthState } from "../../types";

const EventsWorkspace = dynamic(() => import("../DashboardPage").then((module) => module.DashboardPage), { loading: () => <DashboardLoading /> });
const DashboardSectionRoute = dynamic(() => import("./DashboardSectionRoute").then((module) => module.DashboardSectionRoute), { loading: () => <DashboardLoading /> });

function DashboardLoading() {
  return <div className="cd-workspace-loading min-h-screen grid place-items-center bg-[#f7f4ef]" role="status" aria-label="Loading dashboard"><span /></div>;
}

export function DashboardRoute() {
  const { auth, isLoading, login, logout } = useAuth();
  const [toastMessage, setToastMessage] = useState("");
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const section = pathname.startsWith("/dashboard/analytics") ? "analytics" : pathname.startsWith("/dashboard/billing") ? "billing" : pathname.startsWith("/dashboard/settings") ? "settings" : null;

  useEffect(() => {
    if (!isLoading && !auth) router.replace("/auth");
  }, [auth, isLoading, router]);

  useEffect(() => {
    const handleToast = (event: Event) => setToastMessage((event as CustomEvent<string>).detail || "");
    window.addEventListener("chobi-toast", handleToast);
    return () => window.removeEventListener("chobi-toast", handleToast);
  }, []);

  if (isLoading || !auth) {
    return <DashboardLoading />;
  }

  const onAuth = (state: DashboardAuthState | null) => state ? login(state) : logout();

  return <div className="min-h-screen font-sans selection:bg-orange-200 selection:text-orange-900">{section ? <DashboardSectionRoute section={section} auth={auth} onAuth={onAuth} onLogout={() => { onAuth(null); router.push("/"); }} showToast={setToastMessage} /> : <EventsWorkspace auth={auth} onAuth={onAuth} showToast={setToastMessage} setView={(view) => { if (view === "landing") router.push("/"); if (view === "auth") router.push("/auth"); }} />}<Toast message={toastMessage} onClose={() => setToastMessage("")} /></div>;
}
