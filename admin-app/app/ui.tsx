"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, CalendarDays, Camera, CreditCard,
  HardDrive, LayoutDashboard, LockKeyhole, LogOut, RefreshCw, Search,
  ShieldCheck, UserRound, Users, X,
} from "lucide-react";
import { getPage, request, type DataTab, type Overview, type Owner, type RecordRow } from "../lib/api";

type View = "overview" | DataTab;
const nav: { id: View; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "App users", icon: UserRound },
  { id: "photographers", label: "Photographers", icon: Camera },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "subscriptions", label: "Payments", icon: CreditCard },
  { id: "trials", label: "Trials", icon: Activity },
  { id: "failures", label: "Indexing failures", icon: AlertTriangle },
  { id: "audit", label: "Audit log", icon: ShieldCheck },
];
const columns: Record<DataTab, { key: string; label: string }[]> = {
  users: [{ key: "email", label: "Email" }, { key: "name", label: "Name" }, { key: "createdAt", label: "Joined" }],
  photographers: [{ key: "email", label: "Studio email" }, { key: "name", label: "Name" }, { key: "plan", label: "Plan" }, { key: "_count", label: "Events" }, { key: "createdAt", label: "Joined" }],
  events: [{ key: "name", label: "Event" }, { key: "photographer", label: "Photographer" }, { key: "status", label: "Status" }, { key: "totalPhotos", label: "Photos" }, { key: "createdAt", label: "Created" }],
  subscriptions: [{ key: "photographer", label: "Studio" }, { key: "provider", label: "Provider" }, { key: "status", label: "Status" }, { key: "amount", label: "Amount" }, { key: "createdAt", label: "Created" }],
  trials: [{ key: "email", label: "Studio email" }, { key: "name", label: "Name" }, { key: "plan", label: "Plan" }, { key: "trialEndsAt", label: "Trial ends" }],
  failures: [{ key: "fileName", label: "Photo" }, { key: "event", label: "Event" }, { key: "processingErrorCode", label: "Error" }, { key: "uploadedAt", label: "Uploaded" }],
  audit: [{ key: "action", label: "Action" }, { key: "resourceType", label: "Resource" }, { key: "createdAt", label: "When" }, { key: "details", label: "Details" }],
};
const formatCount = (count: number) => new Intl.NumberFormat("en-BD").format(count);
const formatDate = (date: unknown) => typeof date === "string" ? new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeZone: "Asia/Dhaka" }).format(new Date(date)) : "—";
const getCell = (row: RecordRow, key: string) => {
  const value = row[key];
  if (key === "_count") return String((value as { events?: number } | null)?.events ?? 0);
  if (key === "photographer") return String((value as { email?: string } | null)?.email ?? "—");
  if (key === "event") return String((value as { name?: string } | null)?.name ?? "—");
  if (key === "amount") return value == null ? "—" : `৳${Number(value).toLocaleString("en-BD")}`;
  if (key.endsWith("At")) return formatDate(value);
  if (key === "details") return value && typeof value === "object" ? JSON.stringify(value) : "—";
  return value == null || value === "" ? "—" : String(value);
};

function Brand() {
  return <div className="brand"><img src="/chobidao.webp" alt="" /><div><strong>Chobi Dao</strong><small>OWNER CONSOLE</small></div></div>;
}

function Login({ onLogin, busy, error, notice }: { onLogin: (email: string, password: string) => Promise<void>; busy: boolean; error: string; notice: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <main className="auth-layout">
    <section className="auth-story"><Brand /><div className="auth-story-copy"><span className="section-tag">THE BUSINESS BEHIND THE MOMENTS</span><h1>A clear view of<br /><em>everything.</em></h1><p>Accounts, events, payments and platform health in one private workspace for Chobi Dao owners.</p></div><div className="auth-story-bottom"><span className="story-rule" /> Private operations · Chobi Dao</div></section>
    <section className="auth-panel"><div className="auth-card"><div className="auth-icon"><LockKeyhole size={20} /></div><span className="section-tag">OWNER ACCESS</span><h2>Sign in to your console</h2><p className="subtle">Use your dedicated owner credentials.</p><form onSubmit={(event) => { event.preventDefault(); void onLogin(email, password); }}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@chobidao.internal" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>{error && <p className="form-message error" role="alert">{error}</p>}{notice && <p className="form-message success" role="status">{notice}</p>}<button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Open owner console"}<ArrowRight size={17} /></button></form><p className="auth-foot"><ShieldCheck size={14} /> Access is verified on every request</p></div></section>
  </main>;
}

function ChangePassword({ onSave, busy, error }: { onSave: (current: string, next: string) => Promise<void>; busy: boolean; error: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  return <main className="password-page"><div className="password-card"><Brand /><div className="auth-icon"><LockKeyhole size={20} /></div><span className="section-tag">FIRST SIGN IN</span><h1>Set your own password.</h1><p className="subtle">Replace the temporary password before opening platform data.</p><form onSubmit={(event) => { event.preventDefault(); void onSave(current, next); }}><label>Temporary password<input type="password" autoComplete="current-password" required value={current} onChange={(event) => setCurrent(event.target.value)} /></label><label>New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={next} onChange={(event) => setNext(event.target.value)} /><span className="field-hint">At least 12 characters.</span></label>{error && <p className="form-message error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save new password"}<ArrowRight size={17} /></button></form></div></main>;
}

function Metric({ label, value, icon: Icon, accent = false }: { label: string; value: string | number; icon: typeof Users; accent?: boolean }) {
  return <article className={`metric ${accent ? "metric-accent" : ""}`}><div className="metric-top"><span>{label}</span><Icon size={18} strokeWidth={1.8} /></div><strong>{value}</strong></article>;
}

export function AdminConsole() {
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState<Owner | null>(null);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [retrying, setRetrying] = useState("");

  const signOut = useCallback(() => { sessionStorage.removeItem("chobi-owner-token"); setToken(""); setOwner(null); setOverview(null); setRows([]); }, []);
  useEffect(() => { setToken(sessionStorage.getItem("chobi-owner-token") || ""); setBooting(false); }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    request<{ owner: Owner }>("/v1/admin/auth/me", token).then(({ owner: profile }) => { if (active) setOwner(profile); }).catch((reason: Error) => { if (active) { signOut(); setError(reason.message); } });
    return () => { active = false; };
  }, [token, signOut]);
  useEffect(() => {
    if (!token || !owner || owner.mustChangePassword) return;
    let active = true;
    request<Overview>("/v1/admin/overview", token).then((data) => { if (active) setOverview(data); }).catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [token, owner, refreshKey]);
  useEffect(() => {
    if (!token || !owner || owner.mustChangePassword || view === "overview") return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      getPage(view, token, query).then((page) => { if (active) { setRows(page.items); setNextCursor(page.nextCursor); setHasMore(page.hasMore); } }).catch((reason: Error) => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    }, query ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [token, owner, view, query, refreshKey]);

  const login = async (email: string, password: string) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request<{ accessToken: string; owner: Owner }>("/v1/admin/auth/login", undefined, { method: "POST", body: JSON.stringify({ email, password }) });
      sessionStorage.setItem("chobi-owner-token", result.accessToken);
      setOwner(result.owner); setToken(result.accessToken);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sign in failed"); }
    finally { setBusy(false); }
  };
  const changePassword = async (currentPassword: string, newPassword: string) => {
    setBusy(true); setError("");
    try {
      await request("/v1/admin/auth/password", token, { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      signOut(); setNotice("Password updated. Sign in with your new password.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Password update failed"); }
    finally { setBusy(false); }
  };
  const loadMore = async () => {
    if (view === "overview" || !nextCursor || loading) return;
    setLoading(true);
    try { const page = await getPage(view, token, query, nextCursor); setRows((current) => [...current, ...page.items]); setNextCursor(page.nextCursor); setHasMore(page.hasMore); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load more records"); }
    finally { setLoading(false); }
  };
  const retry = async (id: string) => {
    setRetrying(id);
    try { await request(`/v1/admin/failures/${encodeURIComponent(id)}/retry`, token, { method: "POST" }); setRows((current) => current.filter((item) => item.id !== id)); setRefreshKey((value) => value + 1); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Retry failed"); }
    finally { setRetrying(""); }
  };
  const navigate = (next: View) => { setView(next); setQuery(""); setRows([]); setError(""); };

  if (booting || (token && !owner)) return <main className="loading-page"><Brand /><p>Opening owner console…</p></main>;
  if (!token) return <Login onLogin={login} busy={busy} error={error} notice={notice} />;
  if (owner?.mustChangePassword) return <ChangePassword onSave={changePassword} busy={busy} error={error} />;

  const displayTitle = view === "overview" ? "Platform overview" : nav.find((item) => item.id === view)?.label;
  return <main className="console">
    <aside className="sidebar"><Brand /><div className="sidebar-group"><span className="sidebar-caption">WORKSPACE</span><nav aria-label="Owner console">{nav.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`side-link ${view === id ? "selected" : ""}`} onClick={() => navigate(id)} aria-current={view === id ? "page" : undefined}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></button>)}</nav></div><div className="sidebar-footer"><div className="owner-profile"><span className="owner-avatar">{owner?.name?.charAt(0) || "O"}</span><div><strong>{owner?.name}</strong><small>{owner?.email}</small></div></div><button className="signout" onClick={signOut}><LogOut size={16} /> Sign out</button></div></aside>
    <section className="main"><header className="topbar"><div><span className="section-tag">CHOBI DAO / OWNER CONSOLE</span><h1>{displayTitle}</h1><p>Live platform data from your Chobi Dao workspace.</p></div><button className="refresh-button" onClick={() => setRefreshKey((value) => value + 1)} aria-label="Refresh data"><RefreshCw size={16} /> Refresh</button></header>
      {error && <div className="alert" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
      <section className="metric-grid" aria-label="Platform metrics">
        <Metric label="App users" value={overview ? formatCount(overview.users) : "—"} icon={UserRound} accent />
        <Metric label="Photographers" value={overview ? formatCount(overview.photographers) : "—"} icon={Camera} />
        <Metric label="Events" value={overview ? formatCount(overview.events) : "—"} icon={CalendarDays} />
        <Metric label="Photos stored" value={overview ? formatCount(overview.photos) : "—"} icon={Users} />
        <Metric label="Revenue received" value={overview ? `৳${formatCount(overview.revenueBdt)}` : "—"} icon={CreditCard} />
        <Metric label="Active plans" value={overview ? formatCount(overview.activeSubscriptions) : "—"} icon={Activity} />
      </section>
      {view === "overview" ? <div className="overview-lower"><section className="overview-panel"><div className="panel-heading"><span className="section-tag">PLATFORM ACTIVITY</span><h2>The numbers that matter.</h2><p>A quick pulse of accounts, matching and payments.</p></div><div className="fact-list"><div><span>Successful face matches</span><strong>{overview ? formatCount(overview.successfulMatches) : "—"}</strong></div><div><span>Studios in trial</span><strong>{overview ? formatCount(overview.trials) : "—"}</strong></div><div><span>Storage used</span><strong>{overview ? `${(overview.storageBytes / 1024 ** 3).toFixed(2)} GB` : "—"}</strong></div></div></section><section className="health-panel"><div className="health-mark"><ShieldCheck size={22} /></div><span className="section-tag">ATTENTION NEEDED</span><h2>Keep the platform moving.</h2><div className="health-facts"><button onClick={() => navigate("failures")}><span>Failed indexing</span><strong>{overview ? formatCount(overview.failedPhotos) : "—"}</strong><ArrowRight size={16} /></button><button onClick={() => navigate("subscriptions")}><span>Pending payments</span><strong>{overview ? formatCount(overview.pendingPayments) : "—"}</strong><ArrowRight size={16} /></button></div></section></div> : <section className="records"><div className="records-head"><div><span className="section-tag">LIVE RECORDS</span><h2>{displayTitle}</h2></div>{view !== "failures" && view !== "audit" && <label className="search"><Search size={17} /><span className="sr-only">Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" /></label>}</div><div className="table-wrap"><table><thead><tr>{columns[view].map(({ key, label }) => <th key={key}>{label}</th>)}{view === "failures" && <th>Action</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || index)}>{columns[view].map(({ key }) => <td key={key} title={getCell(row, key)}>{key === "status" ? <span className={`status-pill status-${String(row.status).toLowerCase()}`}>{getCell(row, key)}</span> : getCell(row, key)}</td>)}{view === "failures" && <td><button className="table-action" disabled={retrying === row.id} onClick={() => void retry(String(row.id))}>{retrying === row.id ? "Queueing…" : "Retry"}</button></td>}</tr>)}</tbody></table>{loading && rows.length === 0 && <p className="empty">Loading records…</p>}{!loading && rows.length === 0 && <p className="empty">No matching records.</p>}</div>{hasMore && <div className="load-more"><button className="table-action" disabled={loading} onClick={() => void loadMore()}>{loading ? "Loading…" : "Load more"}</button></div>}</section>}
      <footer className="main-footer"><span><HardDrive size={13} /> Chobi Dao platform operations</span><span>Private owner access</span></footer>
    </section>
  </main>;
}
