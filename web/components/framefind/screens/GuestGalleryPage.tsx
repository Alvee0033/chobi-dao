import { useState, useEffect, useCallback, useRef, memo } from "react";
import { type SearchPhoto, getGuestSessionPhotos, requestGuestPhotoRemoval } from "@/lib/api";
import { Icons } from "../icons";
import type { ShowToast } from "../types";
import { ClayCard } from "../ui/ClayCard";
import { PhotoLightbox } from "../ui/PhotoLightbox";
import { downloadPhoto } from "@/lib/browser-compat";
import "./guest-gallery.css";

// Memoized PhotoCard to prevent unnecessary grid re-renders
const PhotoCard = memo(function PhotoCard({
  photo,
  idx,
  isSelected,
  isSelectMode,
  slug,
  toggleSelect,
  downloadSingle,
  onOpenLightbox,
  onRemovePhoto,
  removalRequested,
  canRequestRemoval
}: {
  photo: SearchPhoto;
  idx: number;
  isSelected: boolean;
  isSelectMode: boolean;
  slug: string;
  toggleSelect: (id: string) => void;
  downloadSingle: (url: string, filename: string) => void;
  onOpenLightbox: (idx: number) => void;
  onRemovePhoto: (photoId: string) => void;
  removalRequested: boolean;
  canRequestRemoval: boolean;
}) {
  return (
    <article
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 320px" }}
      className={`guest-gallery-card ${
        isSelected 
          ? "is-selected"
          : ""
      }`}
    >
      <button type="button"
        onClick={() => {
          if (isSelectMode) {
            toggleSelect(photo.id);
          } else {
            onOpenLightbox(idx);
          }
        }}
        className="guest-gallery-image"
        aria-label={isSelectMode ? `${isSelected ? "Deselect" : "Select"} photo ${idx + 1}` : `View photo ${idx + 1}`}
      >
        <img
          src={photo.thumbSmallUrl || photo.thumbMediumUrl || photo.thumbUrl || ""}
          alt={`Event photo ${idx + 1}`}
          loading={idx < 4 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={idx < 2 ? "high" : "low"}
          className="w-full h-full object-cover"
        />

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
        ) : null}
      </button>
      <div className="guest-gallery-card-info"><div><strong>Photo {String(idx + 1).padStart(2, "0")}</strong>{canRequestRemoval && <span>{photo.canRemoveOriginal ? "Just you" : "Group photo"}</span>}</div><div className="guest-gallery-card-actions"><button type="button" onClick={() => downloadSingle(photo.fullUrl, `${slug}-photo-${idx + 1}.jpg`)} aria-label={`Download photo ${idx + 1}`}><Icons.Download size={16} /><span>Download</span></button>{canRequestRemoval && <button type="button" disabled={removalRequested} onClick={() => onRemovePhoto(photo.id)} aria-label={photo.canRemoveOriginal ? `Remove photo ${idx + 1}` : `Request removal of group photo ${idx + 1}`}><Icons.Trash size={15} /><span>{removalRequested ? "Request sent" : photo.canRemoveOriginal ? "Remove" : "Request removal"}</span></button>}</div></div>
    </article>
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
  const [currentTotal, setCurrentTotal] = useState(totalCount);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(() => new Set());
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [confirmPhotoId, setConfirmPhotoId] = useState<string | null>(null);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState(initialOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(max-width: 620px)").matches) setLayout("list");
  }, []);

  const loadMorePhotos = useCallback(async () => {
    if (loadingMoreRef.current || nextOffset >= currentTotal || sessionToken === "public-person-share") return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await getGuestSessionPhotos(slug, sessionToken, nextOffset);
      setPhotos((current) => {
        const seen = new Set(current.map((photo) => photo.id));
        return [...current, ...result.photos.filter((photo) => !seen.has(photo.id))];
      });
      setNextOffset(result.nextOffset);
      setCurrentTotal(result.count);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load more photos.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [nextOffset, currentTotal, sessionToken, slug, showToast]);


  // Reset visible count if photos array changes
  useEffect(() => {
    setVisibleCount(16);
    setPhotos(initialPhotos);
    setCurrentTotal(totalCount);
    setNextOffset(initialOffset);
  }, [initialPhotos, initialOffset, totalCount]);

  useEffect(() => {
    if (visibleCount >= photos.length && (nextOffset >= currentTotal || loadingMore)) return;

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
  }, [visibleCount, photos.length, nextOffset, currentTotal, loadingMore, loadMorePhotos]);

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

  const removeGuestPhoto = useCallback(async (photoId: string) => {
    if (removingPhotoId) return;
    setRemovingPhotoId(photoId);
    try {
      const result = await requestGuestPhotoRemoval(slug, sessionToken, photoId);
      if (result.status === "removed") {
        const removedIndex = photos.findIndex((photo) => photo.id === photoId);
        setPhotos((current) => current.filter((photo) => photo.id !== photoId));
        setCurrentTotal((count) => Math.max(0, count - 1));
        if (removedIndex >= 0 && removedIndex < nextOffset) setNextOffset((offset) => Math.max(0, offset - 1));
        setSelectedIds((current) => { const next = new Set(current); next.delete(photoId); return next; });
        setLightboxIndex(null);
        showToast("Solo photo removed from the event. The photographer can restore it for 30 days.");
      } else {
        setRequestedIds((current) => new Set(current).add(photoId));
        showToast("Group photo stays in the gallery. Your request was sent to the photographer.");
      }
      setConfirmPhotoId(null);
    } catch (error) { showToast(error instanceof Error ? error.message : "Could not request photo removal."); }
    finally { setRemovingPhotoId(null); }
  }, [removingPhotoId, slug, sessionToken, showToast, photos, nextOffset]);

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
      const seen = new Set(allPhotos.map((photo) => photo.id));
      while (offset < currentTotal) {
        const page = await getGuestSessionPhotos(slug, sessionToken, offset);
        allPhotos = [...allPhotos, ...page.photos.filter((photo) => { if (seen.has(photo.id)) return false; seen.add(photo.id); return true; })];
        if (page.nextOffset <= offset) break;
        offset = page.nextOffset;
        if (!page.hasMore) break;
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
    <main className="guest-gallery-page" data-testid="gallery-page">
      {/* Header */}
      <header className="guest-gallery-header">
        <button type="button" className="guest-gallery-brand" onClick={onStartOver}>
          <img src="/assets/chobidao.webp" alt="Chobi Dao" className="w-9 h-9 object-contain drop-shadow-md" />
          <span>Chobi Dao</span>
        </button>
        <button 
          onClick={onStartOver} 
          className="guest-gallery-new-search"
        >
          <Icons.ChevronLeft size={16} />
          New search
        </button>
      </header>

      {/* Main Container */}
      <div className="guest-gallery-content">



        {indexingCount > 0 && (
          <div className="guest-gallery-notice" role="status">
            {indexingCount} event photo{indexingCount === 1 ? " is" : "s are"} still processing. More matches may appear later.
            <button onClick={onStartOver} className="ml-2 font-bold text-orange-700 underline underline-offset-2">Scan again later</button>
          </div>
        )}
        {/* Info & Toolbar */}
        <div className="guest-gallery-intro">
          <div>
            <div className="guest-gallery-eyebrow">
              <span>
                <i /> YOUR EVENT PHOTOS
              </span>
            </div>
            <h1>Found your <em>moments.</em></h1>
            <p>
              <strong>{currentTotal}</strong> photo{currentTotal === 1 ? "" : "s"} of you, ready to keep.
            </p>
          </div>

          <div className="guest-gallery-toolbar">
            {photos.length > 0 && (
              <>
                <div className="guest-gallery-layout" role="group" aria-label="Gallery layout"><button type="button" className={layout === "grid" ? "active" : ""} aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}>Grid</button><button type="button" className={layout === "list" ? "active" : ""} aria-pressed={layout === "list"} onClick={() => setLayout("list")}>List</button></div>
                <button
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    setSelectedIds(new Set());
                  }}
                  className="guest-gallery-select"
                >
                  <Icons.Check size={14} />
                  {isSelectMode ? "Done" : "Select"}
                </button>

                {isSelectMode ? (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="guest-gallery-select"
                    >
                      {selectedIds.size === photos.length ? <Icons.CheckSquare size={14} className="text-orange-600" /> : <Icons.Square size={14} />}
                      {selectedIds.size === photos.length ? "Deselect loaded" : "Select loaded"}
                    </button>

                    <button
                      onClick={handleDownloadSelected}
                      disabled={selectedIds.size === 0}
                      className="guest-gallery-download"
                    >
                      <Icons.Download size={14} />
                      Download ({selectedIds.size})
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleDownloadAll}
                    className="guest-gallery-download"
                  >
                    <Icons.Download size={15} />
                    Download all ({currentTotal})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        {photos.length === 0 ? (
          <ClayCard className="guest-gallery-empty">
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
          <div className="guest-gallery-results">
            <div className={`guest-gallery-grid ${layout === "list" ? "as-list" : ""}`}>
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
                  onRemovePhoto={setConfirmPhotoId}
                  removalRequested={requestedIds.has(photo.id)}
                  canRequestRemoval={sessionToken !== "public-person-share"}
                  onOpenLightbox={setLightboxIndex}
                />
              ))}
            </div>
            {(visibleCount < photos.length || nextOffset < currentTotal) && (
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
      {confirmPhotoId && <div className="guest-gallery-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !removingPhotoId) setConfirmPhotoId(null); }}><section className="guest-gallery-dialog" role="alertdialog" aria-modal="true" aria-labelledby="guest-photo-removal-title" aria-describedby="guest-photo-removal-copy"><div className="guest-gallery-dialog-icon"><Icons.Trash size={20} /></div><h2 id="guest-photo-removal-title">{photos.find((photo) => photo.id === confirmPhotoId)?.canRemoveOriginal ? "Remove this photo?" : "Request group photo removal?"}</h2><p id="guest-photo-removal-copy">{photos.find((photo) => photo.id === confirmPhotoId)?.canRemoveOriginal ? "This solo photo will disappear from the event and everyone’s gallery. The photographer can restore it for 30 days." : "This group photo includes other people. It stays in the event while the photographer reviews your request."}</p><div className="guest-gallery-dialog-actions"><button type="button" disabled={!!removingPhotoId} onClick={() => setConfirmPhotoId(null)}>Keep photo</button><button type="button" disabled={!!removingPhotoId} onClick={() => void removeGuestPhoto(confirmPhotoId)}>{removingPhotoId ? "Please wait…" : photos.find((photo) => photo.id === confirmPhotoId)?.canRemoveOriginal ? "Remove photo" : "Send request"}</button></div></section></div>}
    </main>
  );
}
