"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getBillingUsage, type BillingUsage } from "@/lib/api";
import type { DashboardAuthState } from "../../types";
import { Icons } from "../../icons";
import "./settings-section.css";

const formatStorage = (bytes: number) => {
  const gb = bytes / 1024 ** 3;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`;
};

export function SettingsSection({ auth }: { auth: DashboardAuthState }) {
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsage(await getBillingUsage(auth.accessToken));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Usage could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [auth.accessToken]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const used = usage?.storageUsedBytes ?? 0;
  const limit = usage?.storageLimitBytes ?? 0;
  const remaining = Math.max(0, limit - used);
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <section className="cd-settings" aria-labelledby="settings-title">
      <header className="cd-settings-heading">
        <span>ACCOUNT</span>
        <h1 id="settings-title">Settings</h1>
        <p>Your account details and photo storage at a glance.</p>
      </header>

      <article className="cd-settings-account">
        <div className="cd-settings-avatar" aria-hidden="true">{auth.name?.trim().charAt(0).toUpperCase() || "C"}</div>
        <div className="cd-settings-identity">
          <span className="cd-settings-label">ACCOUNT</span>
          <h2>{auth.name || "Photographer"}</h2>
          <p>{auth.email}</p>
        </div>
        <Link className="cd-settings-plan" href="/dashboard/billing">
          <span>{usage?.plan === "pro" ? "PRO PLAN" : "FREE PLAN"}</span>
          <strong>Manage plan <Icons.ArrowRight size={15} /></strong>
        </Link>
      </article>

      <article className="cd-settings-storage" aria-labelledby="storage-title">
        <div className="cd-settings-storage-top">
          <div className="cd-settings-storage-icon"><Icons.Image size={19} /></div>
          <div className="cd-settings-storage-copy">
            <span className="cd-settings-label">PHOTO STORAGE</span>
            <h2 id="storage-title">Your remaining space</h2>
          </div>
          {loading ? <span className="cd-settings-loading" role="status">Loading…</span> : usage && (
            <div className="cd-settings-remaining"><strong>{formatStorage(remaining)}</strong><span>left</span></div>
          )}
        </div>

        {loading ? <div className="cd-settings-skeleton" aria-hidden="true" /> : error ? (
          <div className="cd-settings-usage-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadUsage()}>Try again</button></div>
        ) : usage ? (
          <>
            <div className="cd-settings-meter" role="progressbar" aria-label="Photo storage used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className="cd-settings-storage-meta">
              <span><strong>{formatStorage(used)}</strong> used</span>
              <span>{formatStorage(limit)} total · {usage.photosUsed} {usage.photosUsed === 1 ? "photo" : "photos"}</span>
            </div>
            {percent >= 85 && <p className="cd-settings-storage-note">You’re running low on space. Upgrade for more room.</p>}
            {usage.plan !== "pro" && <Link className="cd-settings-upgrade" href="/dashboard/billing">Get 20 GB with Pro <Icons.ArrowRight size={15} /></Link>}
          </>
        ) : null}
      </article>

      <p className="cd-settings-help">Need help with your account? <a href="mailto:support@chobidao.com">Contact support</a></p>
    </section>
  );
}
