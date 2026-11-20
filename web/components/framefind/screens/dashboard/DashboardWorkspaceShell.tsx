"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icons } from "../../icons";
import type { DashboardAuthState } from "../../types";
import "./workspace-shell.css";

export type WorkspaceSection = "events" | "analytics" | "billing" | "settings";

const sections: { id: WorkspaceSection; label: string; href: string; Icon: typeof Icons.Camera }[] = [
  { id: "events", label: "Events", href: "/dashboard", Icon: Icons.Camera },
  { id: "analytics", label: "Analytics", href: "/dashboard/analytics", Icon: Icons.BarChart },
  { id: "billing", label: "Plan & billing", href: "/dashboard/billing", Icon: Icons.Lock },
  { id: "settings", label: "Settings", href: "/dashboard/settings", Icon: Icons.Settings },
];

export function DashboardWorkspaceShell({ section, auth, onLogout, children }: {
  section: WorkspaceSection;
  auth: DashboardAuthState;
  onLogout: () => void;
  children: ReactNode;
}) {
  const current = sections.find((item) => item.id === section)!;
  return <div className="cd-workspace">
    <aside className="cd-workspace-sidebar" aria-label="Studio workspace">
      <Link className="cd-workspace-brand" href="/dashboard"><span className="cd-workspace-logo"><img src="/logo-mark.webp" alt="" /></span><span>Chobi Dao<small>PHOTOGRAPHER STUDIO</small></span></Link>
      <Link className="cd-workspace-create" href="/dashboard/events/new"><Icons.Plus size={17} /> Create event</Link>
      <nav className="cd-workspace-links" aria-label="Dashboard navigation"><small>WORKSPACE</small>{sections.map(({ id, label, href, Icon }) => <Link key={id} href={href} aria-current={id === section ? "page" : undefined} className={id === section ? "is-active" : ""}><Icon size={18} /><span>{label}</span>{id === section && <i />}</Link>)}</nav>
      <div className="cd-workspace-account"><div className="cd-workspace-avatar">{auth.name?.[0]?.toUpperCase() || "P"}</div><div className="cd-workspace-account-copy"><strong>{auth.name || "Photographer"}</strong><small>{auth.email}</small></div><button type="button" onClick={onLogout} aria-label="Log out" title="Log out"><Icons.LogOut size={16} /></button></div>
    </aside>
    <header className="cd-workspace-mobile"><Link href="/dashboard" className="cd-workspace-brand"><span className="cd-workspace-logo"><img src="/logo-mark.webp" alt="" /></span><span>Chobi Dao</span></Link><span>{current.label}</span></header>
    <nav className="cd-workspace-mobile-nav" aria-label="Dashboard navigation">{sections.map(({ id, label, href, Icon }) => <Link key={id} href={href} aria-current={id === section ? "page" : undefined} className={id === section ? "is-active" : ""}><Icon size={18} /><span>{label === "Plan & billing" ? "Billing" : label}</span></Link>)}</nav>
    <main className="cd-workspace-main"><div className="cd-workspace-topline"><div><span>YOUR STUDIO</span><b>/</b><strong>{current.label}</strong></div><Link href="/dashboard/events/new"><Icons.Plus size={16} /> New event</Link></div>{children}</main>
  </div>;
}
