import { useState, useEffect, useCallback, useRef, memo } from "react";
import { type SearchPhoto, getGuestSessionPhotos } from "@/lib/api";
import { Icons } from "../icons";
import type { ShowToast } from "../types";
import { ClayButton } from "../ui/ClayButton";
import { ClayCard } from "../ui/ClayCard";
import { PhotoLightbox } from "../ui/PhotoLightbox";
import { downloadPhoto } from "@/lib/browser-compat";

// Memoized PhotoCard to prevent unnecessary grid re-renders
const PhotoCard = memo(function PhotoCard({
  photo,
  idx,
  isSelected,
  isSelectMode,
  slug,
  toggleSelect,
  downloadSingle,
  onOpenLightbox
}: {
  photo: SearchPhoto;
  idx: number;
  isSelected: boolean;
  isSelectMode: boolean;
  slug: string;
  toggleSelect: (id: string) => void;
  downloadSingle: (url: string, filename: string) => void;
  onOpenLightbox: (idx: number) => void;
}) {
  return (
    <div 
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 320px" }}
      className={`aspect-square p-1.5 rounded-3xl bg-white/90 backdrop-blur-sm border transition-all duration-300 ${
        isSelected 
          ? "border-orange-500 shadow-lg ring-4 ring-orange-500/20 scale-[0.98]" 
          : "border-orange-100/40 hover:shadow-xl hover:border-orange-300 hover:-translate-y-1"
      }`}
    >
      <div 
        onClick={() => {
          if (isSelectMode) {
            toggleSelect(photo.id);
          } else {
            onOpenLightbox(idx);
          }
        }}
        className="w-full h-full rounded-[22px] overflow-hidden relative group bg-gradient-to-tr from-orange-50 to-amber-50/50 cursor-pointer select-none"
      >
        <img
          src={photo.thumbSmallUrl || photo.thumbMediumUrl || photo.thumbUrl || ""}
          alt={`Event photo ${idx + 1}`}
          loading={idx < 4 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={idx < 2 ? "high" : "low"}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isSelected ? "scale-105 brightness-90" : "group-hover:scale-110"
          }`}
        />

        {/* Match score badge */}
        {photo.similarity && !isSelectMode && (
          <div className="absolute top-2.5 left-2.5 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-black/60 backdrop-blur-md text-orange-300 border border-white/10 shadow-sm flex items-center gap-1">
              <Icons.Sparkles size={10} />
              {Math.round(photo.similarity * 100)}%
            </span>
          </div>
        )}

        {/* Interactive Selection Overlays */}
        {isSelectMode ? (
          <div className="absolute top-3 right-3 z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shadow-md ${
              isSelected 
                ? "bg-orange-500 border-orange-500 text-white scale-110" 
                : "bg-white/90 border-orange-200 text-transparent hover:border-orange-400"
            }`}>
              <Icons.Check size={16} className="stroke-[3.5]" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-between p-4 backdrop-blur-[2px]">
            <span className="text-white text-xs font-black tracking-wide flex items-center gap-1.5 drop-shadow-md">
              <Icons.Maximize2 size={13} /> Tap to expand
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadSingle(photo.fullUrl, `${slug}-photo-${idx + 1}.jpg`);
              }}
              className="bg-white hover:bg-orange-50 text-orange-600 p-2.5 rounded-2xl shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all hover:scale-110 active:scale-95 border border-orange-100"
              title="Quick download"
            >
              <Icons.Download size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export function GuestGalleryPage({ 
  showToast, 
  slug, 
  photos: initialPhotos,
  totalCount,
  nextOffset: initialOffset,
  sessionToken,
  indexingCount = 0,
  onStartOver 
}: { 
  showToast: ShowToast; 
  slug: string; 
  photos: SearchPhoto[];
  totalCount: number;
  nextOffset: number;
  indexingCount?: number;
  sessionToken: string; 
  onStartOver: () => void 
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(16);
  const [photos, setPhotos] = useState(initialPhotos);
  const [nextOffset, setNextOffset] = useState(initialOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadMorePhotos = useCallback(async () => {
    if (loadingMoreRef.current || nextOffset >= totalCount || sessionToken === "public-person-share") return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await getGuestSessionPhotos(slug, sessionToken, nextOffset);
      setPhotos((current) => {
        const seen = new Set(current.map((photo) => photo.id));
        return [...current, ...result.photos.filter((photo) => !seen.has(photo.id))];
      });
      setNextOffset(result.nextOffset);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load more photos.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loadingMore, nextOffset, totalCount, sessionToken, slug, showToast]);


  // Reset visible count if photos array changes
  useEffect(() => {
    setVisibleCount(16);
    setPhotos(initialPhotos);
    setNextOffset(initialOffset);
  }, [initialPhotos, initialOffset]);

  useEffect(() => {
    if (visibleCount >= photos.length && (nextOffset >= totalCount || loadingMore)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (visibleCount < photos.length) setVisibleCount((prev) => Math.min(prev + 16, photos.length));
          else void loadMorePhotos();
        }
      },
      { threshold: 0.1, rootMargin: "300px" }
    );

    const target = document.getElementById("load-more-trigger");
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [visibleCount, photos.length, nextOffset, totalCount, loadingMore, loadMorePhotos]);

  const downloadSinglePhoto = useCallback(async (photoUrl: string, filename: string) => {
    showToast("Downloading photo...");
    await downloadPhoto(photoUrl, filename);
  }, [showToast]);

  const toggleSelectPhoto = useCallback((photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map(p => p.id)));
    }
  };

  const handleDownloadSelected = async () => {
    const targets = photos.filter(p => selectedIds.has(p.id));
    if (targets.length === 0) return;
    showToast(`Downloading ${targets.length} selected photos...`);
    for (let i = 0; i < targets.length; i++) {
      const photo = targets[i];
      await downloadSinglePhoto(photo.fullUrl, `${slug}-selected-${i + 1}.jpg`);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    showToast("Downloads initiated successfully!");
  };

  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    try {
      let allPhotos = [...photos];
      let offset = nextOffset;
      while (offset < totalCount) {
        const page = await getGuestSessionPhotos(slug, sessionToken, offset);
        allPhotos = [...allPhotos, ...page.photos.filter((photo) => !allPhotos.some((loaded) => loaded.id === photo.id))];
        offset = page.nextOffset;
        if (!page.photos.length && page.hasMore) break;
      }
      showToast(`Downloading all ${allPhotos.length} photos...`);
      for (let i = 0; i < allPhotos.length; i++) {
        const photo = allPhotos[i];
        await downloadSinglePhoto(photo.fullUrl, `${slug}-photo-${i + 1}.jpg`);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      showToast("All downloads initiated successfully!");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not prepare all downloads.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10 p-4 pb-24 md:p-8" data-testid="gallery-page">
      {/* Header */}
      <header className="flex justify-between items-center max-w-5xl w-full mx-auto py-4 mb-8 bg-white/60 backdrop-blur-xl px-6 rounded-3xl border border-orange-100/60 shadow-sm">
        <div className="flex items-center gap-3 text-orange-600 font-heading font-black text-2xl tracking-tight cursor-pointer" onClick={onStartOver}>
          <img src="/assets/chobidao.webp" alt="Chobi Dao" className="w-9 h-9 object-contain drop-shadow-md" />
          <span>Chobi dao</span>
        </div>
        <button 
          onClick={onStartOver} 
          className="h-10 px-5 text-xs font-black text-orange-600 bg-orange-50 hover:bg-orange-100/80 rounded-2xl transition-all border border-orange-200/60 active:scale-95 flex items-center gap-2 shadow-sm"
        >
          <Icons.ChevronLeft size={16} />
          New Search
        </button>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto w-full flex-1">



        {indexingCount > 0 && (
          <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-charcoal" role="status">
            {indexingCount} event photo{indexingCount === 1 ? " is" : "s are"} still processing. More matches may appear later.
            <button onClick={onStartOver} className="ml-2 font-bold text-orange-700 underline underline-offset-2">Scan again later</button>
          </div>
        )}
        {/* Info & Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 bg-white/60 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-orange-100/60 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center gap-1.5">
                <Icons.Sparkles size={13} /> AI Matched
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-heading text-charcoal tracking-tight">Your Event Gallery</h1>
            <p className="text-sm sm:text-base text-muted font-bold mt-1">
              Found <span className="text-orange-600 font-black">{totalCount}</span> photos of you in this event.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {photos.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    setSelectedIds(new Set());
                  }}
                  className={`h-11 px-5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border shadow-sm active:scale-95 ${
                    isSelectMode 
                      ? "bg-charcoal text-white border-charcoal" 
                      : "bg-white text-charcoal border-orange-200/80 hover:bg-orange-50/50"
                  }`}
                >
                  <Icons.Check size={14} />
                  {isSelectMode ? "Done" : "Select"}
                </button>

                {isSelectMode ? (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="h-11 px-4 bg-white hover:bg-orange-50 text-charcoal border border-orange-200/80 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-sm active:scale-95"
                    >
                      {selectedIds.size === photos.length ? <Icons.CheckSquare size={14} className="text-orange-600" /> : <Icons.Square size={14} />}
                      {selectedIds.size === photos.length ? "Deselect loaded" : "Select loaded"}
                    </button>

                    <button
                      onClick={handleDownloadSelected}
                      disabled={selectedIds.size === 0}
                      className="h-11 px-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                    >
                      <Icons.Download size={14} />
                      Download ({selectedIds.size})
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleDownloadAll}
                    className="h-11 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
                  >
                    <Icons.Download size={15} />
                    Download All ({totalCount})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        {photos.length === 0 ? (
          <ClayCard className="p-16 text-center text-muted bg-white/60 backdrop-blur-xl border-dashed border-2 border-orange-200/80 rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-orange-100/60 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
              <Icons.Image size={32} />
            </div>
            <h3 className="text-xl font-black text-charcoal mb-2">No Matching Photos Found</h3>
            <p className="text-sm text-muted font-bold max-w-sm mx-auto">Try taking another selfie with good lighting and facing the camera directly.</p>
            <button
              onClick={onStartOver}
              className="mt-6 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
            >
              <Icons.Camera size={16} /> Take New Selfie
            </button>
          </ClayCard>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {photos.slice(0, visibleCount).map((photo, idx) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  idx={idx}
                  isSelected={selectedIds.has(photo.id)}
                  isSelectMode={isSelectMode}
                  slug={slug}
                  toggleSelect={toggleSelectPhoto}
                  downloadSingle={downloadSinglePhoto}
                  onOpenLightbox={(index) => setLightboxIndex(index)}
                />
              ))}
            </div>
            {(visibleCount < photos.length || nextOffset < totalCount) && (
              <div id="load-more-trigger" className="h-20 w-full flex items-center justify-center py-6">
                {loadingMore ? <Icons.Loader size={28} className="text-orange-500" /> : <Icons.Loader size={28} className="text-orange-500" />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(newIdx) => setLightboxIndex(newIdx)}
          onDownload={downloadSinglePhoto}
          slug={slug}
        />
      )}
    </div>
  );
}
