import { FormEvent, useState, useEffect } from "react";
import { getPublicEvent } from "@/lib/api";
import { Icons } from "../icons";
import type { ShowToast } from "../types";
import { ClayCard } from "../ui/ClayCard";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10 selection:bg-orange-200">
      <button 
        onClick={() => router.push("/")} 
        className="absolute top-6 left-6 flex items-center gap-3 text-orange-600 font-heading font-black text-2xl hover:scale-105 transition-all drop-shadow-sm"
      >
        <img src="/logo-mark.webp" alt="Chobi Dao" className="w-9 h-9 object-contain" />
        <span>Chobi dao</span>
      </button>

      <ClayCard className="w-full max-w-md text-center flex flex-col items-center p-8 bg-white/70 backdrop-blur-2xl rounded-3xl border border-orange-100/80 shadow-2xl">
        <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center mb-6 shadow-xl shadow-orange-500/25">
          <Icons.QrCode size={28} className="stroke-[2.5]" />
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-black font-heading text-charcoal mb-2 tracking-tight">Access Your Event</h2>
        <p className="text-xs sm:text-sm text-muted font-bold mb-6 px-2 leading-relaxed">
          Enter the event code or link shared by your photographer to instantly find your photos.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full" data-testid="guest-start-form">
          <div className="relative group w-full">
            <input
              type="text"
              placeholder="e.g. wedding-party"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              className="w-full bg-orange-50/30 border-2 border-orange-200/60 hover:border-orange-300 focus:border-orange-500 px-5 py-4 rounded-2xl text-center font-black text-lg text-charcoal placeholder:text-muted/40 focus:outline-none focus:bg-white transition-all shadow-inner tracking-wider"
              data-testid="guest-slug-input"
            />
          </div>
          <button 
            type="submit" 
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2" 
            disabled={loading}
          >
            {loading ? <Icons.Loader size={18} /> : <Icons.FaceId size={20} />}
            <span>{loading ? "Verifying Event..." : "Continue to Face Scan"}</span>
          </button>
        </form>

        {recentSlugs.length > 0 && (
          <div className="mt-6 pt-5 border-t border-orange-100/80 w-full text-left">
            <span className="text-[10px] uppercase font-black tracking-widest text-muted/80 block mb-2">Recent Events:</span>
            <div className="flex flex-wrap gap-2">
              {recentSlugs.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setCode(s);
                    handleAccess(s);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100/80 text-orange-600 border border-orange-200/50 text-xs font-bold transition-all active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </ClayCard>
    </div>
  );
}
