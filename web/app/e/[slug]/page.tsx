import Link from "next/link";
import { notFound } from "next/navigation";
import { BackgroundBlobs } from "@/components/framefind/ui/BackgroundBlobs";
import { Icons } from "@/components/framefind/icons";
import { ClayCard } from "@/components/framefind/ui/ClayCard";

import { getApiBaseUrl } from "@/lib/api";

function getSsrApiBase() {
  if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL;
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://api-gateway:3001";
  }
  return getApiBaseUrl();
}

async function getEvent(slug: string): Promise<{ slug: string; name: string; searchEnabled: boolean } | null> {
  const apiBase = getSsrApiBase();
  try {
    const res = await fetch(`${apiBase}/v1/e/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch event "${slug}":`, err);
    return null;
  }
}

export default async function EventLandingPage({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);

  if (!event) {
    return (
      <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
        <BackgroundBlobs />
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
          <Link 
            href="/" 
            className="absolute top-6 left-6 flex items-center gap-3 text-orange-600 font-heading font-black text-2xl hover:scale-105 transition-all drop-shadow-sm"
          >
            <img src="/logo-mark.webp" alt="Chobi Dao" className="w-9 h-9 object-contain" />
            <span>Chobi dao</span>
          </Link>

          <ClayCard className="w-full max-w-md text-center flex flex-col items-center p-8 bg-white/40 backdrop-blur-md rounded-3xl border border-orange-100/50 shadow-xl">
            <div className="w-16 h-16 rounded-[22px] bg-red-100 text-red-500 flex items-center justify-center mb-6 shadow-lg shadow-red-500/10">
              <Icons.FaceId size={28} className="stroke-[2.5]" />
            </div>
            
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-2">Event Not Found</p>
            <h1 className="text-2xl font-black font-heading text-charcoal mb-3 tracking-tight">"{params.slug}"</h1>
            <p className="text-sm text-muted font-bold mb-8 px-2 leading-relaxed">
              We couldn't find an active event matching this slug. Please verify the URL or ask your photographer for the link.
            </p>

            <div className="w-full flex flex-col gap-4">
              <Link href="/find" className="w-full">
                <button 
                  className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Find An Event
                </button>
              </Link>
            </div>
          </ClayCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
      <BackgroundBlobs />
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <Link 
          href="/" 
          className="absolute top-6 left-6 flex items-center gap-3 text-orange-600 font-heading font-black text-2xl hover:scale-105 transition-all drop-shadow-sm"
        >
          <img src="/logo-mark.webp" alt="Chobi Dao" className="w-9 h-9 object-contain" />
          <span>Chobi dao</span>
        </Link>

        <ClayCard className="w-full max-w-md text-center flex flex-col items-center p-8 bg-white/40 backdrop-blur-md rounded-3xl border border-orange-100/50 shadow-xl">
          <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
            <Icons.FaceId size={28} className="stroke-[2.5]" />
          </div>
          
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 mb-2">Event Access</p>
          <h1 className="text-3xl font-black font-heading text-charcoal mb-3 tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted font-bold mb-8 px-2 leading-relaxed">
            {event.searchEnabled
              ? "Find only the photos that include you. Complete a quick face scan to open your private gallery."
              : "Photo matching is not enabled for this event yet. Please contact your photographer."}
          </p>

          <div className="w-full flex flex-col gap-4">
            <Link href={event.searchEnabled ? `/e/${encodeURIComponent(event.slug)}/scan` : "#"} className="w-full">
              <button 
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                disabled={!event.searchEnabled}
              >
                <Icons.FaceId size={18} />
                Find my photos
              </button>
            </Link>
            <Link href="/find" className="text-xs font-black text-muted/65 hover:text-charcoal transition-colors">
              Enter a different event slug
            </Link>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
