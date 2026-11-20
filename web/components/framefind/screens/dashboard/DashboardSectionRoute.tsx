"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getPhotographerAnalytics, type PhotographerAnalytics } from "@/lib/api";
import { Icons } from "../../icons";
import type { DashboardAuthState, ShowToast } from "../../types";
import { DashboardWorkspaceShell, type WorkspaceSection } from "./DashboardWorkspaceShell";
import type { SettingsState } from "./model";
import "./dashboard-sections.css";

const AnalyticsSection = dynamic(() => import("./AnalyticsSection").then((module) => module.AnalyticsSection), { loading: () => <SectionLoading /> });
const BillingSection = dynamic(() => import("./BillingSection").then((module) => module.BillingSection), { loading: () => <SectionLoading /> });
const SettingsSection = dynamic(() => import("./SettingsSection").then((module) => module.SettingsSection), { loading: () => <SectionLoading /> });

function SectionLoading() {
  return <div className="cd-section-loading" role="status"><Icons.Loader size={20} /> Loading your workspace…</div>;
}

export function DashboardSectionRoute({ section, auth, onLogout, showToast }: {
  section: Exclude<WorkspaceSection, "events">;
  auth: DashboardAuthState;
  onLogout: () => void;
  showToast: ShowToast;
}) {
  const [analytics, setAnalytics] = useState<PhotographerAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(section === "analytics");
  const [settings, setSettings] = useState<SettingsState>({ publicProfile: true, emailNotifications: false, autoOptimization: true });

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
    {section === "analytics" ? <AnalyticsSection analyticsData={analytics} isLoadingAnalytics={analyticsLoading} /> : null}
    {section === "billing" ? <BillingSection auth={auth} showToast={showToast} /> : null}
    {section === "settings" ? <SettingsSection auth={auth} settingsState={settings} setSettingsState={setSettings} showToast={showToast} /> : null}
  </DashboardWorkspaceShell>;
}
