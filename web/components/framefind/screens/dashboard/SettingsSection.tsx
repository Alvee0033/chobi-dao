"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  changeAccountPassword, getAccountAvatar, getBillingUsage, getNotificationPreferences, requestAccountEmailChange,
  saveNotificationPreferences, updateAccountProfile, uploadAccountAvatar, verifyAccountEmailChange,
  type AccountPreferences, type BillingUsage,
} from "@/lib/api";
import type { DashboardAuthState } from "../../types";
import { Icons } from "../../icons";
import "./settings-section.css";

const defaults: AccountPreferences = { eventUpdates: true, weeklySummary: false, productNews: false };
const formatStorage = (bytes: number) => {
  const gb = bytes / 1024 ** 3;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`;
};
const failure = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";

export function SettingsSection({ auth, onAuth }: { auth: DashboardAuthState; onAuth: (state: DashboardAuthState | null) => void }) {
  const router = useRouter();
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatar, setAvatar] = useState("");
  const [name, setName] = useState(auth.name ?? "");
  const [preferences, setPreferences] = useState(defaults);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityBusy, setSecurityBusy] = useState(false);

  const loadUsage = useCallback(async () => {
    setLoading(true); setError("");
    try { setUsage(await getBillingUsage(auth.accessToken)); }
    catch (caught) { setError(failure(caught)); }
    finally { setLoading(false); }
  }, [auth.accessToken]);

  useEffect(() => {
    void loadUsage();
    getNotificationPreferences(auth.accessToken).then(result => setPreferences(result.preferences)).catch(() => {});
  }, [auth.accessToken, loadUsage]);
  useEffect(() => {
    let objectUrl = "";
    let active = true;
    getAccountAvatar(auth.accessToken).then(blob => {
      objectUrl = URL.createObjectURL(blob);
      if (active) setAvatar(objectUrl);
    }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [auth.accessToken]);

  const used = usage?.storageUsedBytes ?? 0;
  const limit = usage?.storageLimitBytes ?? 0;
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const saveName = async (event: FormEvent) => {
    event.preventDefault(); setNotice(""); setSavingProfile(true);
    try {
      const result = await updateAccountProfile(auth.accessToken, name);
      const updated = { ...auth, name: result.photographer.name };
      localStorage.setItem("framefind.auth", JSON.stringify(updated));
      onAuth(updated); setNotice("Your profile details are saved.");
    } catch (caught) { setNotice(failure(caught)); }
    finally { setSavingProfile(false); }
  };
  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setNotice("Choose a JPG, PNG, or WebP image under 4 MB."); return;
    }
    setNotice(""); setPhotoBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read that image.")); reader.readAsDataURL(file);
      });
      await uploadAccountAvatar(auth.accessToken, dataUrl);
      const blob = await getAccountAvatar(auth.accessToken);
      setAvatar(current => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(blob); });
      setNotice("Profile photo updated.");
    } catch (caught) { setNotice(failure(caught)); }
    finally { setPhotoBusy(false); }
  };
  const savePreference = async (key: keyof AccountPreferences) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next); setSavingPreferences(true); setNotice("");
    try { const saved = await saveNotificationPreferences(auth.accessToken, next); setPreferences(saved.preferences); setNotice("Notification preferences saved."); }
    catch (caught) { setPreferences(preferences); setNotice(failure(caught)); }
    finally { setSavingPreferences(false); }
  };
  const requestEmail = async (event: FormEvent) => {
    event.preventDefault(); setSecurityBusy(true); setNotice("");
    try {
      const result = await requestAccountEmailChange(auth.accessToken, email, emailPassword);
      setPendingEmail(result.email); setNotice(`A verification code was sent to ${result.email}.`);
      setEmailPassword("");
    } catch (caught) { setNotice(failure(caught)); }
    finally { setSecurityBusy(false); }
  };
  const verifyEmail = async (event: FormEvent) => {
    event.preventDefault(); setSecurityBusy(true); setNotice("");
    try { await verifyAccountEmailChange(auth.accessToken, emailCode); signOut(); }
    catch (caught) { setNotice(failure(caught)); }
    finally { setSecurityBusy(false); }
  };
  const updatePassword = async (event: FormEvent) => {
    event.preventDefault(); setNotice("");
    if (newPassword !== confirmPassword) { setNotice("The new passwords do not match."); return; }
    setSecurityBusy(true);
    try { await changeAccountPassword(auth.accessToken, currentPassword, newPassword); signOut(); }
    catch (caught) { setNotice(failure(caught)); }
    finally { setSecurityBusy(false); }
  };
  function signOut() {
    localStorage.removeItem("framefind.auth");
    onAuth(null);
    router.push("/auth");
  }

  return (
    <section className="cd-settings" aria-labelledby="settings-title">
      <header className="cd-settings-heading">
        <span>YOUR ACCOUNT</span><h1 id="settings-title">Settings</h1>
        <p>Personal details, preferences, and account security in one place.</p>
      </header>

      {notice && <div className="cd-settings-notice" role="status"><Icons.Check size={16} />{notice}</div>}

      <div className="cd-settings-layout">
        <div className="cd-settings-primary">
          <article className="cd-settings-panel">
            <div className="cd-settings-panel-heading"><div><span className="cd-settings-label">PROFILE</span><h2>Personal information</h2><p>How your studio account appears across Chobi Dao.</p></div><span className="cd-settings-step">01</span></div>
            <div className="cd-settings-photo-row">
              <div className="cd-settings-avatar">{avatar ? <img src={avatar} alt="" /> : <span>{name.trim().charAt(0).toUpperCase() || "C"}</span>}</div>
              <div className="cd-settings-photo-copy"><strong>Profile photo</strong><span>JPG, PNG, or WebP · up to 4 MB</span></div>
              <label className="cd-settings-secondary-button">{photoBusy ? "Uploading…" : "Upload photo"}<input aria-label="Upload profile photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={uploadPhoto} /></label>
            </div>
            <form onSubmit={saveName} className="cd-settings-form">
              <label className="cd-settings-field"><span>Full name</span><input autoComplete="name" maxLength={80} required value={name} onChange={event => setName(event.target.value)} /></label>
              <label className="cd-settings-field"><span>Email address</span><input value={auth.email} readOnly aria-readonly="true" /><small>Change your email in Account security.</small></label>
              <button className="cd-settings-primary-button" type="submit" disabled={savingProfile || name.trim() === auth.name}>{savingProfile ? "Saving…" : "Save profile"}</button>
            </form>
          </article>

          <article className="cd-settings-panel">
            <div className="cd-settings-panel-heading"><div><span className="cd-settings-label">EMAIL PREFERENCES</span><h2>Notifications</h2><p>Choose the updates you want to receive.</p></div><span className="cd-settings-step">02</span></div>
            <div className="cd-settings-preferences">
              {([
                ["eventUpdates", "Event activity", "Important updates about your event galleries."],
                ["weeklySummary", "Weekly studio summary", "A short overview of your photos and activity."],
                ["productNews", "Product news", "Occasional tips and new Chobi Dao features."],
              ] as const).map(([key, title, description]) => (
                <div className="cd-settings-preference" key={key}><div><strong>{title}</strong><span>{description}</span></div><button type="button" role="switch" aria-checked={preferences[key]} aria-label={title} disabled={savingPreferences} className={preferences[key] ? "is-on" : ""} onClick={() => void savePreference(key)}><span /></button></div>
              ))}
            </div>
          </article>

          <article className="cd-settings-panel">
            <div className="cd-settings-panel-heading"><div><span className="cd-settings-label">ACCOUNT SECURITY</span><h2>Email &amp; password</h2><p>Verify sensitive changes before they take effect.</p></div><span className="cd-settings-step">03</span></div>
            {!pendingEmail ? (
              <form onSubmit={requestEmail} className="cd-settings-form cd-settings-security-form">
                <label className="cd-settings-field"><span>New email address</span><input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@studio.com" /></label>
                <label className="cd-settings-field"><span>Current password</span><input type="password" autoComplete="current-password" required value={emailPassword} onChange={event => setEmailPassword(event.target.value)} /></label>
                <button className="cd-settings-secondary-button" disabled={securityBusy}>{securityBusy ? "Sending code…" : "Verify new email"}</button>
              </form>
            ) : (
              <form onSubmit={verifyEmail} className="cd-settings-form cd-settings-security-form"><p className="cd-settings-pending">Enter the six-digit code sent to <strong>{pendingEmail}</strong>. It expires in 10 minutes.</p><label className="cd-settings-field"><span>Verification code</span><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={emailCode} onChange={event => setEmailCode(event.target.value.replace(/\D/g, ""))} /></label><button className="cd-settings-secondary-button" disabled={securityBusy}>{securityBusy ? "Verifying…" : "Confirm email change"}</button><button type="button" className="cd-settings-text-button" onClick={() => { setPendingEmail(""); setEmailCode(""); }}>Cancel</button></form>
            )}
            <div className="cd-settings-divider" />
            <form onSubmit={updatePassword} className="cd-settings-form cd-settings-password-form">
              <div className="cd-settings-password-title"><strong>Change password</strong><span>Use at least 10 characters. You’ll sign in again after saving.</span></div>
              <label className="cd-settings-field"><span>Current password</span><input type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
              <div className="cd-settings-password-fields"><label className="cd-settings-field"><span>New password</span><input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label><label className="cd-settings-field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label></div>
              <button className="cd-settings-secondary-button" disabled={securityBusy}>{securityBusy ? "Updating…" : "Update password"}</button>
            </form>
          </article>
        </div>

        <aside className="cd-settings-aside">
          <article className="cd-settings-account-card">
            <div className="cd-settings-account-top"><div className="cd-settings-avatar cd-settings-avatar-small">{avatar ? <img src={avatar} alt="" /> : <span>{name.trim().charAt(0).toUpperCase() || "C"}</span>}</div><div><strong>{name || "Photographer"}</strong><span>{auth.email}</span></div></div>
            <Link className="cd-settings-plan" href="/dashboard/billing"><span>{usage?.plan === "pro" ? "PRO PLAN" : "FREE PLAN"}</span><strong>Manage plan <Icons.ArrowRight size={15} /></strong></Link>
          </article>
          <article className="cd-settings-storage" aria-labelledby="storage-title">
            <div className="cd-settings-storage-top"><div className="cd-settings-storage-icon"><Icons.Image size={19} /></div><div className="cd-settings-storage-copy"><span className="cd-settings-label">PHOTO STORAGE</span><h2 id="storage-title">Space remaining</h2></div></div>
            {loading ? <div className="cd-settings-skeleton" aria-hidden="true" /> : error ? <div className="cd-settings-usage-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadUsage()}>Retry</button></div> : usage ? <><div className="cd-settings-space-total"><strong>{formatStorage(Math.max(0, limit - used))}</strong><span>of {formatStorage(limit)} free</span></div><div className="cd-settings-meter" role="progressbar" aria-label="Photo storage used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><span style={{ width: `${percent}%` }} /></div><div className="cd-settings-storage-meta"><span>{formatStorage(used)} used</span><span>{usage.photosUsed} photos</span></div>{usage.plan !== "pro" && <Link className="cd-settings-upgrade" href="/dashboard/billing">Get 20 GB with Pro <Icons.ArrowRight size={15} /></Link>}</> : null}
          </article>
          <p className="cd-settings-help">Need help? <a href="mailto:support@chobidao.com">Contact support</a></p>
        </aside>
      </div>
    </section>
  );
}
