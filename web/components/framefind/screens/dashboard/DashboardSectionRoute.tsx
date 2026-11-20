"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getPhotographerAnalytics, type PhotographerAnalytics } from "@/lib/api";
import { Icons } from "../../icons";
import type { DashboardAuthState, ShowToast } from "../../types";
import { DashboardWorkspaceShell, type WorkspaceSection } from "./DashboardWorkspaceShell";
import "./dashboard-sections.css";

const AnalyticsSection = dynamic(() => import("./AnalyticsSection").then((module) => module.AnalyticsSection), { loading: () => <SectionLoading /> });
const BillingSection = dynamic(() => import("./BillingSection").then((module) => module.BillingSection), { loading: () => <SectionLoading /> });
const SettingsSection = dynamic(() => import("./SettingsSection").then((module) => module.SettingsSection), { loading: () => <SectionLoading /> });

function SectionLoading() {
  return <div className="cd-section-loading" role="status"><Icons.Loader size={20} /> Loading your workspace…</div>;
}

export function DashboardSectionRoute({ section, auth, onAuth, onLogout, showToast }: {
  section: Exclude<WorkspaceSection, "events">;
  auth: DashboardAuthState;
  onAuth: (state: DashboardAuthState | null) => void;
  onLogout: () => void;
  showToast: ShowToast;
}) {
  const [analytics, setAnalytics] = useState<PhotographerAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(section === "analytics");

  useEffect(() => {
    if (section !== "analytics") return;
    let active = true;
    getPhotographerAnalytics(auth.accessToken).then((result) => { if (active) setAnalytics(result); }).catch((error) => {
      console.error("Unable to load photographer analytics", error);
      if (active) showToast("Analytics could not be loaded. Please try again later.");
    }).finally(() => { if (active) setAnalyticsLoading(false); });
    return () => { active = false; };
  }, [auth.accessToken, section, showToast]);

  return <DashboardWorkspaceShell section={section} auth={auth} onLogout={onLogout}>
    <div className="cd-route-transition" key={section}>
      {section === "analytics" ? <AnalyticsSection analyticsData={analytics} isLoadingAnalytics={analyticsLoading} /> : null}
      {section === "billing" ? <BillingSection auth={auth} showToast={showToast} /> : null}
      {section === "settings" ? <SettingsSection auth={auth} onAuth={onAuth} /> : null}
    </div>
  </DashboardWorkspaceShell>;
}
