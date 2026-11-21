"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CreditCard, Database, LogOut, RefreshCw, Search, Users, X } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api-chobi.203.96.190.78.sslip.io";
type Overview = { photographers: number; events: number; photos: number; failedPhotos: number; activeSubscriptions: number; trials: number; pendingPayments: number; storageBytes: number };
type Row = Record<string, unknown>;
type Tab = "photographers" | "trials" | "events" | "subscriptions" | "failures" | "audit";
const tabs: Array<{ id: Tab; label: string }> = [{ id: "photographers", label: "Photographers" }, { id: "trials", label: "Trials" }, { id: "events", label: "Events" }, { id: "subscriptions", label: "Payments" }, { id: "failures", label: "Indexing failures" }, { id: "audit", label: "Audit log" }];

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) }, cache: "no-store" });
  if (!response.ok) throw new Error((await response.text()).slice(0, 220) || `Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function AdminConsole() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>("photographers");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState("");

  const signOut = useCallback(() => { sessionStorage.removeItem("chobi-admin-token"); setToken(""); setOverview(null); setRows([]); }, []);
  useEffect(() => { setToken(sessionStorage.getItem("chobi-admin-token") || ""); }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    Promise.all([api<{ photographer: { isAdmin?: boolean } }>("/v1/auth/me", token), api<Overview>("/v1/admin/overview", token)])
      .then(([profile, metrics]) => { if (!profile.photographer?.isAdmin) throw new Error("This verified account does not have staff access."); if (active) setOverview(metrics); })
      .catch((reason: Error) => { if (active) { setError(reason.message); signOut(); } });
    return () => { active = false; };
  }, [token, signOut]);
  useEffect(() => {
    if (!token || !overview) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams(); if (query.trim()) params.set("q", query.trim());
      api<{ items: Row[]; nextCursor: string | null; hasMore: boolean }>(`/v1/admin/${tab}?${params}`, token).then((page) => { if (active) { setRows(page.items); setNextCursor(page.nextCursor); setHasMore(page.hasMore); } }).catch((reason: Error) => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    }, query ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [token, overview, tab, query]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setLoginBusy(true);
    try {
      const response = await fetch(`${API}/v1/auth/photographer/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Sign in failed");
      sessionStorage.setItem("chobi-admin-token", result.accessToken); setToken(result.accessToken);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sign in failed"); }
    finally { setLoginBusy(false); }
  };
  const retry = async (id: string) => { setRetrying(id); try { await api(`/v1/admin/failures/${encodeURIComponent(id)}/retry`, token, { method: "POST" }); setRows((current) => current.filter((item) => item.id !== id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Retry failed"); } finally { setRetrying(""); } };
  const loadMore = async () => { if (!nextCursor || loading) return; setLoading(true); try { const params = new URLSearchParams({ cursor: nextCursor }); if (query.trim()) params.set("q", query.trim()); const page = await api<{ items: Row[]; nextCursor: string | null; hasMore: boolean }>(`/v1/admin/${tab}?${params}`, token); setRows((current) => [...current, ...page.items]); setNextCursor(page.nextCursor); setHasMore(page.hasMore); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load more records"); } finally { setLoading(false); } };
  const columns = tab === "photographers" ? ["email", "name", "plan", "trialEndsAt", "_count"] : tab === "trials" ? ["email", "name", "plan", "trialEndsAt"] : tab === "events" ? ["name", "slug", "status", "totalPhotos", "photographer"] : tab === "subscriptions" ? ["provider", "status", "plan", "amount", "transactionId", "photographer"] : tab === "failures" ? ["fileName", "processingErrorCode", "uploadedAt", "event", "photographer"] : ["action", "resourceType", "resourceId", "createdAt", "details"];
  const cell = (row: Row, key: string) => { const value = row[key]; if (value && typeof value === "object") return JSON.stringify(value); return value == null ? "—" : String(value); };

  if (!token) return <main className="login-page"><div className="login-card"><div className="brand"><img className="brand-logo" src="/chobidao.webp" alt="" /><span>Chobi Dao<small>OPERATIONS</small></span></div><p className="eyebrow">PRIVATE STAFF CONSOLE</p><h1>Welcome back.</h1><p className="muted">Sign in with your verified staff account.</p><form onSubmit={login}><label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="error">{error}</p>}<button disabled={loginBusy}>{loginBusy ? "Checking access…" : "Sign in securely"}<ArrowRight size={17} /></button></form><p className="footnote">Access is checked against the staff role on every API request.</p></div></main>;

  const metrics = overview ? [{ label: "Photographers", value: overview.photographers, icon: Users }, { label: "Events", value: overview.events, icon: Activity }, { label: "Photos", value: overview.photos, icon: Database }, { label: "Active plans", value: overview.activeSubscriptions, icon: CreditCard }, { label: "Trials", value: overview.trials, icon: Activity }, { label: "Pending payments", value: overview.pendingPayments, icon: CreditCard }, { label: "Failed indexing", value: overview.failedPhotos, icon: AlertTriangle }, { label: "Storage", value: `${(overview.storageBytes / 1024 ** 3).toFixed(1)} GB`, icon: Database }] : [];
  return <main className="console"><aside className="sidebar"><div className="brand"><img className="brand-logo" src="/chobidao.webp" alt="" /><span>Chobi Dao<small>OPERATIONS</small></span></div><div className="sidebar-label">STAFF TOOLS</div>{tabs.map((item) => <button key={item.id} className={`side-link ${tab === item.id ? "selected" : ""}`} onClick={() => setTab(item.id)}>{item.label}</button>)}<div className="sidebar-bottom"><div className="secure"><span className="green-dot" /> API authorization active</div><button className="signout" onClick={signOut}><LogOut size={16} /> Sign out</button></div></aside><section className="main"><header className="topbar"><div><p className="eyebrow">SAAS OPERATIONS</p><h1>Control room</h1></div><button className="icon-btn" aria-label="Refresh metrics" onClick={() => window.location.reload()}><RefreshCw size={16} /></button></header>{error && <div className="alert"><span>{error}</span><button onClick={() => setError("")}><X size={15} /></button></div>}<div className="metric-grid">{metrics.map(({ label, value, icon: Icon }) => <article className="metric" key={label}><span className="metric-icon"><Icon size={18} /></span><span className="metric-label">{label}</span><strong>{value}</strong></article>)}</div><section className="records"><div className="records-head"><div><p className="eyebrow">LIVE RECORDS</p><h2>{tabs.find((item) => item.id === tab)?.label}</h2></div>{tab !== "failures" && tab !== "audit" && <label className="search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records" /></label>}</div><div className="table-wrap"><table><thead><tr>{columns.map((col) => <th key={col}>{col.replace(/[A-Z]/g, (m) => ` ${m}`)}</th>)}{tab === "failures" && <th />}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((col) => <td key={col} title={cell(row, col)}>{col === "photographer" ? cell(row.photographer as Row, "email") : col === "event" ? cell(row.event as Row, "name") : cell(row, col)}</td>)}{tab === "failures" && <td className="action-cell"><button className="retry" disabled={retrying === row.id} onClick={() => void retry(String(row.id))}>{retrying === row.id ? "Queueing…" : "Retry indexing"}</button></td>}</tr>)}</tbody></table>{loading && <p className="empty">Loading records…</p>}{!loading && rows.length === 0 && <p className="empty">No matching records.</p>}</div>{hasMore && <div className="load-more"><button className="retry" disabled={loading} onClick={() => void loadMore()}>{loading ? "Loading…" : "Load more records"}</button></div>}</section><footer>Chobi Dao Operations <span>Changes that affect customer accounts are intentionally disabled.</span></footer></section></main>;
}
