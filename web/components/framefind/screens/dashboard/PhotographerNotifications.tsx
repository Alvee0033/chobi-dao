"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPhotographerNotifications, type PhotographerNotification } from "@/lib/api";
import { Icons } from "../../icons";
import "./photographer-notifications.css";

export function PhotographerNotifications({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PhotographerNotification[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await getPhotographerNotifications(token);
      setItems(result.items);
      setCount(result.count);
      setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!open) return;
    void refresh();
    const dismiss = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", dismiss); document.removeEventListener("keydown", escape); };
  }, [open, refresh]);

  return <div className="cd-notifications" ref={root}>
    <button type="button" className="cd-notifications-trigger" aria-label={`Notifications${count ? `, ${count} items need attention` : ""}`} aria-expanded={open} aria-controls="photographer-notifications-panel" onClick={() => setOpen((value) => !value)}>
      <Icons.Bell size={19} />{count > 0 && <span className="cd-notifications-count">{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <section id="photographer-notifications-panel" className="cd-notifications-panel" aria-label="Notifications">
      <div className="cd-notifications-heading"><div><small>YOUR STUDIO</small><h2>Notifications</h2></div><button type="button" onClick={() => void refresh()} aria-label="Refresh notifications"><span aria-hidden="true">↻</span></button></div>
      <p className="cd-notifications-subtitle">{count ? `${count} item${count === 1 ? "" : "s"} need your attention` : "You’re all caught up"}</p>
      <div className="cd-notifications-list">
        {loading && !items.length ? <p className="cd-notifications-state" role="status">Loading notifications…</p> : error && !items.length ? <p className="cd-notifications-state" role="alert">Couldn’t load notifications. Try refresh.</p> : items.length ? items.map((item) => <Link key={item.id} href={`/dashboard/events/${encodeURIComponent(item.eventId)}/photos`} onClick={() => setOpen(false)} className="cd-notifications-item">
          <span className={`cd-notifications-item-icon ${item.kind}`}><Icons.Camera size={18} /></span><span><strong>{item.title}</strong><small>{item.eventName} · {item.detail}</small><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></span><Icons.ArrowRight size={15} />
        </Link>) : <p className="cd-notifications-state">Guest requests and photo processing issues will appear here.</p>}
      </div>
      {count > items.length && <p className="cd-notifications-more">Showing the 20 most recent items</p>}
    </section>}
  </div>;
}
