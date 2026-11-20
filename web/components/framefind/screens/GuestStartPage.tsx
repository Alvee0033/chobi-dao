import { FormEvent, useState, useEffect } from "react";
import { getPublicEvent } from "@/lib/api";
import { Icons } from "../icons";
import type { ShowToast } from "../types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./find-page.css";

export function GuestStartPage({ showToast }: { showToast: ShowToast }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("chobi_recent_events");
      if (stored) {
        setRecentSlugs(JSON.parse(stored).slice(0, 3));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAccess = async (targetSlug: string) => {
    const slug = targetSlug.trim().toLowerCase();
    if (slug.length < 3) {
      showToast("Enter a valid event slug");
      return;
    }

    try {
      setLoading(true);
      const event = await getPublicEvent(slug);
      if (!event.searchEnabled) {
        showToast("Photo matching is not enabled for this event yet.");
        return;
      }
      // Save to recent
      try {
        const nextRecent = Array.from(new Set([slug, ...recentSlugs])).slice(0, 4);
        localStorage.setItem("chobi_recent_events", JSON.stringify(nextRecent));
      } catch {
        // ignore
      }
      router.push(`/e/${encodeURIComponent(slug)}/scan`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Event not found. Please check code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleAccess(code);
  };

  return (
    <main className="ff-find-page">
      <header className="ff-find-header"><button onClick={() => router.push("/")} className="ff-find-brand" aria-label="Chobi Dao home"><img src="/logo-mark.webp" alt="" /> Chobi Dao</button><Link href="/auth" className="ff-find-for-studio">Photographer login <Icons.ArrowRight size={14} /></Link></header>
      <section className="ff-find-center" aria-labelledby="find-title">
        <span className="ff-find-eyebrow"><i /> YOUR EVENT, YOUR MOMENTS</span>
        <h1 id="find-title">Find your <em>photos.</em></h1>
        <p>Enter the event code from your photographer to find the photos you’re in.</p>
        <form onSubmit={handleSubmit} className="ff-find-form" data-testid="guest-start-form"><label htmlFor="event-code">EVENT CODE OR LINK</label><div className="ff-find-field"><Icons.QrCode size={20} /><input id="event-code" type="text" placeholder="e.g. wedding-party" value={code} onChange={(e) => setCode(e.target.value)} autoFocus data-testid="guest-slug-input" /></div><button type="submit" disabled={loading}>{loading ? <><Icons.Loader size={17} /> Finding your event…</> : <>Continue <Icons.ArrowRight size={17} /></>}</button><span className="ff-find-private"><Icons.Lock size={13} /> Private matching. No app needed.</span></form>
        {recentSlugs.length > 0 && <div className="ff-find-recent"><span>RECENT EVENTS</span><div>{recentSlugs.map((s) => <button key={s} onClick={() => { setCode(s); handleAccess(s); }}>{s}<Icons.ArrowRight size={12} /></button>)}</div></div>}
        <div className="ff-find-steps"><span><i>01</i> Enter code</span><b>·</b><span><i>02</i> Take a selfie</span><b>·</b><span><i>03</i> See your photos</span></div>
      </section>
      <footer className="ff-find-footer"><span>CHOBI DAO</span><span>MADE FOR THE MOMENTS THAT MATTER</span></footer>
    </main>
  );
}
