import Image from "next/image";
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { getEventPeople, getEventPhotos, deletePhoto, type EventPhoto, type EventPerson } from "@/lib/api";
import { Icons } from "../../icons";
import type { ShowToast } from "../../types";
import { ClayButton } from "../../ui/ClayButton";
import { ClayCard } from "../../ui/ClayCard";
import { localPreviewCache, type UploadItem } from "./model";

const GalleryPhotoCard = memo(function GalleryPhotoCard({
  photo,
  index,
  eventId,
  handleSetThumbnail,
  handleDeletePhoto
}: {
  photo: EventPhoto;
  index: number;
  eventId: string;
  handleSetThumbnail: (eventId: string, url: string) => Promise<void>;
  handleDeletePhoto: (photoId: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const candidates = useMemo(() => {
    const arr = [localPreviewCache[photo.id], photo.thumbSmallUrl, photo.thumbMediumUrl, photo.thumbUrl, photo.url].filter(Boolean) as string[];
    return [...new Set(arr)];
  }, [photo]);

  const [currentSrc, setCurrentSrc] = useState(candidates[0] || "");

  const handleError = () => {
    const idx = candidates.indexOf(currentSrc);
    if (idx >= 0 && idx < candidates.length - 1) {
      setCurrentSrc(candidates[idx + 1]);
    }
  };

  return (
    <ClayCard className="group p-2 relative overflow-hidden bg-white hover:shadow-clay-pressed transition-all">
      <div className="aspect-square rounded-xl overflow-hidden relative">
        {photo.status === "ready" && (
          <div className="absolute top-2 right-2 z-10 p-1.5 bg-green-500/95 text-white rounded-full shadow-md flex items-center justify-center border border-white/40" title="Face recognition completed">
            <Icons.FaceId size={14} className="stroke-[2.5]" />
          </div>
        )}
        {photo.status === "processing" && (
          <div className="absolute top-2 right-2 z-10 p-1.5 bg-blue-500/95 text-white rounded-full shadow-md flex items-center justify-center border border-white/40 animate-pulse" title="Indexing faces...">
            <Icons.Zap size={14} className="stroke-[2.5]" />
          </div>
        )}
        {photo.status === "failed_processing" && (
          <div className="absolute top-2 right-2 z-10 p-1.5 bg-red-500/95 text-white rounded-full shadow-md flex items-center justify-center border border-white/40" title="Face indexing failed">
            <Icons.X size={14} className="stroke-[2.5]" />
          </div>
        )}
        {!loaded && (
          <div className="absolute inset-0 bg-orange-50 animate-pulse" />
        )}
        <img
          src={currentSrc}
          alt={photo.fileName}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading={index < 4 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={index < 2 ? "high" : "low"}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
        {/* Desktop Hover Controls */}
        <div className="hidden lg:flex absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-2 backdrop-blur-[2px]">
           <button 
             onClick={() => window.open(photo.fullUrl || photo.url, "_blank")}
             className="p-2 bg-white rounded-lg text-orange-500 shadow-lg hover:scale-110 transition-transform"
             title="View Full"
           >
             <Icons.ExternalLink size={16} />
           </button>
           <button 
             onClick={() => handleSetThumbnail(eventId, photo.fullUrl || photo.url)}
             className="p-2 bg-white rounded-lg text-green-500 shadow-lg hover:scale-110 transition-transform"
             title="Set as Cover"
           >
             <Icons.Camera size={16} />
           </button>
           <button 
             onClick={() => handleDeletePhoto(photo.id)}
             className="p-2 bg-white rounded-lg text-red-500 shadow-lg hover:scale-110 transition-transform"
             title="Delete"
           >
             <Icons.Trash size={16} />
           </button>
        </div>

        {/* Mobile Touch Controls */}
        <div className="lg:hidden absolute bottom-1 left-1 right-1 bg-white/95 backdrop-blur-sm rounded-lg p-1.5 flex justify-around shadow-sm border border-orange-100/50">
           <button 
             onClick={() => window.open(photo.fullUrl || photo.url, "_blank")}
             className="p-1 text-orange-500 active:scale-95 transition-transform"
             title="View Full"
           >
             <Icons.ExternalLink size={14} />
           </button>
           <button 
             onClick={() => handleSetThumbnail(eventId, photo.fullUrl || photo.url)}
             className="p-1 text-green-500 active:scale-95 transition-transform"
             title="Set as Cover"
           >
             <Icons.Camera size={14} />
           </button>
           <button 
             onClick={() => handleDeletePhoto(photo.id)}
             className="p-1 text-red-500 active:scale-95 transition-transform"
             title="Delete"
           >
             <Icons.Trash size={14} />
           </button>
        </div>
      </div>
      <div className="mt-2 px-1">
        <p className="text-[8px] font-black text-muted truncate uppercase tracking-tighter">{photo.fileName}</p>
      </div>
    </ClayCard>
  );
});

export function PhotoGalleryView({ 
  eventId, 
  onBack, 
  showToast, 
  withRefresh,
  enqueuePhotoUploads,
  handleSetThumbnail,
  uploadingEventId,
  uploadQueue,
  cancelUpload,
  retryUpload,
  onSharePerson,
  onCopyPersonLink
}: { 
  eventId: string; 
  onBack: () => void;
  showToast: ShowToast;
  withRefresh: <T,>(fn: (token: string) => Promise<T>) => Promise<T>;
  enqueuePhotoUploads: (eventId: string, files: File[]) => void;
  handleSetThumbnail: (eventId: string, url: string) => Promise<void>;
  uploadingEventId: string | null;
  uploadQueue: UploadItem[];
  cancelUpload: (uploadId: string) => void;
  retryUpload: (uploadId: string) => void;
  onSharePerson?: (personId: string) => void;
  onCopyPersonLink?: (personId: string) => void;
}) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [people, setPeople] = useState<EventPerson[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [personMenuOpenId, setPersonMenuOpenId] = useState<string | null>(null);
  const [personMenuPosition, setPersonMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleCount, setVisibleCount] = useState(16);

  // Reset visible count if selected person or eventId changes
  useEffect(() => {
    setVisibleCount(16);
  }, [eventId, selectedPersonId]);

  useEffect(() => {
    if (visibleCount >= photos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 16, photos.length));
        }
      },
      { threshold: 0.1, rootMargin: "300px" }
    );

    const target = document.getElementById("load-more-dashboard-trigger");
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [visibleCount, photos.length]);

  const handlePersonLongPressStart = (personId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setPersonMenuOpenId(personId);
    }, 500);
  };

  const handlePersonLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const resolveThumbCandidates = (photo: EventPhoto): string[] => {
    const candidates = [localPreviewCache[photo.id], photo.thumbSmallUrl, photo.thumbMediumUrl, photo.thumbUrl, photo.url].filter(Boolean) as string[];
    return [...new Set(candidates)];
  };

  const loadPhotos = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await withRefresh((token) => getEventPhotos(token, eventId, true, selectedPersonId ?? undefined));
      setPhotos(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  const loadPeople = async (silent = false) => {
    try {
      if (!silent && !people.length) setPeopleLoading(true);
      const data = await withRefresh((token) => getEventPeople(token, eventId));
      setPeople(data);
    } catch {
      setPeople([]);
    } finally {
      setPeopleLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
    loadPeople();
  }, [eventId, selectedPersonId]);

  const eventUploads = useMemo(() => {
    const existingPhotoIds = new Set(photos.map((p) => p.id));
    return uploadQueue.filter(
      (item) =>
          item.eventId === eventId &&
          item.status !== "ready" &&
          (!item.photoId || !existingPhotoIds.has(item.photoId))
    );
  }, [uploadQueue, eventId, photos]);

  useEffect(() => {
    const hasInFlight = eventUploads.some((u) => u.status === "uploading" || u.status === "processing" || u.status === "queued");
    if (!hasInFlight) {
      void loadPhotos(true);
      void loadPeople(true);
      return;
    }
    const id = window.setInterval(() => {
      loadPhotos(true);
      loadPeople(true);
    }, 1500);
    return () => window.clearInterval(id);
  }, [eventUploads, eventId, selectedPersonId]);

  useEffect(() => {
    if (!selectedPersonId) return;
    const exists = people.some((p) => p.personId === selectedPersonId);
    if (!exists) setSelectedPersonId(null);
  }, [people, selectedPersonId]);

  const hasServerSideIndexingInFlight = useMemo(
    () => photos.some((photo) => photo.status === "processing" || photo.status === "uploaded" || photo.status === "pending_upload"),
    [photos],
  );

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await withRefresh((token) => deletePhoto(token, eventId, photoId));
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      void loadPeople(true);
      showToast("Photo deleted");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete photo");
    }
  };

  const activeMenuPerson = personMenuOpenId
    ? people.find((person) => person.personId === personMenuOpenId) ?? null
    : null;

  return (
    <div className="studio-photo-gallery max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex items-center justify-between mb-8 gap-4">
        <div className="hidden lg:flex items-center gap-4 min-w-0">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white border border-orange-100 flex items-center justify-center text-orange-500 shadow-clay-card hover:scale-110 active:scale-95 transition-all"
          >
            <Icons.ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-charcoal">Photo Gallery</h1>
            <p className="text-muted text-xs font-medium uppercase tracking-widest">Event Assets &bull; {photos.length} Total</p>
          </div>
        </div>

        <label className="relative cursor-pointer group ml-auto lg:ml-0">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files) enqueuePhotoUploads(eventId, Array.from(files));
              e.currentTarget.value = "";
            }}
            className="hidden"
          />
          <div className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-clay-pressed flex items-center gap-2 group-hover:scale-105 transition-all">
            {uploadingEventId === eventId ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icons.Plus size={18} />
            )}
            {uploadingEventId === eventId ? "Uploading..." : "Add Photos"}
          </div>
        </label>
      </header>

      <div className="mb-6">
        <div className="flex items-center gap-3 overflow-x-auto overflow-y-visible pb-2 px-0.5">
          {/* All Photos Button */}
          <button
            onClick={() => { setSelectedPersonId(null); setPersonMenuOpenId(null); }}
            className={`shrink-0 flex flex-col items-center gap-1.5 ${selectedPersonId === null ? "opacity-100" : "opacity-70 hover:opacity-90"} transition-opacity`}
          >
            <div className={`w-16 h-16 rounded-full border-2 ${selectedPersonId === null ? "border-orange-500 shadow-md shadow-orange-200" : "border-orange-200"} bg-white flex items-center justify-center transition-all`}>
              <Icons.Users className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-[10px] font-black text-muted uppercase">All</span>
          </button>

          {peopleLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 flex flex-col items-center gap-1.5">
                <div className="w-16 h-16 rounded-full bg-orange-50 border-2 border-orange-100 animate-pulse" />
                <div className="w-12 h-2 bg-orange-50 rounded animate-pulse" />
              </div>
            ))
          ) : (
            people.map((person) => (
              <div
                key={person.personId}
                className="shrink-0 flex flex-col items-center gap-1.5 relative group/person"
              >
                {/* Person Avatar Button */}
                <button
                  onClick={() => { setSelectedPersonId(person.personId); setPersonMenuOpenId(null); }}
                  onTouchStart={() => handlePersonLongPressStart(person.personId)}
                  onTouchEnd={handlePersonLongPressEnd}
                  onTouchMove={handlePersonLongPressEnd}
                  className={`relative w-16 h-16 rounded-full p-[2px] transition-all ${
                    selectedPersonId === person.personId
                      ? "bg-gradient-to-br from-orange-500 to-orange-300 shadow-md shadow-orange-200 scale-105"
                      : "bg-orange-100 hover:bg-orange-200"
                  }`}
                >
                  <img
                    src={person.coverThumbUrl}
                    alt={person.label}
                    className="w-full h-full rounded-full object-cover border-2 border-white"
                  />
                  {/* Photo count badge */}
                  {person.photoCount > 0 && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-orange-500 text-white text-[8px] font-black rounded-full w-4.5 h-4.5 min-w-[18px] min-h-[18px] flex items-center justify-center border border-white shadow-sm px-0.5">
                      {person.photoCount > 99 ? "99+" : person.photoCount}
                    </div>
                  )}
                </button>

                {/* ... Menu Button — visible on hover (desktop) or after long-press (mobile) */}
                {onSharePerson && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (personMenuOpenId === person.personId) {
                        setPersonMenuOpenId(null);
                        setPersonMenuPosition(null);
                        return;
                      }
                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      setPersonMenuPosition({
                        top: Math.max(12, rect.bottom + 8),
                        left: Math.max(12, Math.min(window.innerWidth - 232, rect.right - 220)),
                      });
                      setPersonMenuOpenId(person.personId);
                    }}
                    className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-orange-200 shadow-md flex items-center justify-center text-muted hover:text-orange-500 hover:border-orange-400 transition-all z-10 ${
                      personMenuOpenId === person.personId
                        ? "opacity-100 scale-110"
                        : "opacity-0 group-hover/person:opacity-100 scale-90 group-hover/person:scale-100"
                    }`}
                    title="More options"
                  >
                    <Icons.MoreHorizontal size={10} />
                  </button>
                )}

                <span className="text-[10px] font-black text-muted truncate max-w-[72px]" title={person.label}>{person.label}</span>

              </div>
            ))
          )}
        </div>
        {activeMenuPerson && (onSharePerson || onCopyPersonLink) ? (
          <>
            <div className="fixed inset-0 z-[110]" onClick={() => { setPersonMenuOpenId(null); setPersonMenuPosition(null); }} />
            <div
              className="fixed z-[120] bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden min-w-[220px] max-w-[90vw] animate-in fade-in slide-in-from-top-2 duration-200"
              style={{ top: `${personMenuPosition?.top ?? 64}px`, left: `${personMenuPosition?.left ?? 16}px` }}
            >
              {onCopyPersonLink ? (
                <button
                  onClick={() => { onCopyPersonLink(activeMenuPerson.personId); setPersonMenuOpenId(null); setPersonMenuPosition(null); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-orange-50 text-charcoal font-bold text-xs transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Icons.Copy size={12} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-charcoal">Copy Link</p>
                    <p className="text-[9px] text-muted font-medium">{activeMenuPerson.photoCount} photos</p>
                  </div>
                </button>
              ) : null}
              {onSharePerson ? (
                <>
                  <div className="border-t border-orange-50" />
                  <button
                    onClick={() => { onSharePerson(activeMenuPerson.personId); setPersonMenuOpenId(null); setPersonMenuPosition(null); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-orange-50 text-charcoal font-bold text-xs transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <Icons.ExternalLink size={12} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-charcoal">Share Link</p>
                      <p className="text-[9px] text-muted font-medium">Open share sheet</p>
                    </div>
                  </button>
                </>
              ) : null}
              <div className="border-t border-orange-50" />
              <button
                onClick={() => { setSelectedPersonId(activeMenuPerson.personId); setPersonMenuOpenId(null); setPersonMenuPosition(null); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-orange-50 text-charcoal font-bold text-xs transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icons.Image size={12} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-charcoal">View Their Photos</p>
                  <p className="text-[9px] text-muted font-medium">Filter gallery</p>
                </div>
              </button>
            </div>
          </>
        ) : null}
        {!peopleLoading && people.length === 0 && (eventUploads.length > 0 || hasServerSideIndexingInFlight) ? (
          <p className="text-xs text-muted font-bold mt-2">Faces are being indexed...</p>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5,6,7,8,9,10].map(i => (
            <div key={i} className="aspect-square rounded-2xl bg-orange-50 animate-pulse border border-orange-100" />
          ))}
        </div>
      ) : photos.length === 0 && eventUploads.length === 0 ? (
        <ClayCard className="p-12 text-center bg-white/50 border-dashed border-2 border-orange-100">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-200">
            <Icons.Image size={40} />
          </div>
          <h3 className="text-lg font-black text-charcoal mb-2">{selectedPersonId ? "No photos for this person yet" : "No photos yet"}</h3>
          <p className="text-sm text-muted mb-6">{selectedPersonId ? "Try another person or wait for indexing to complete." : "Upload some photos to get started with this event."}</p>
          {selectedPersonId ? (
            <button
              onClick={() => setSelectedPersonId(null)}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-black"
            >
              Show All Photos
            </button>
          ) : null}
        </ClayCard>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {eventUploads.slice(0, 12).map((item) => (
            <ClayCard key={item.id} className="group p-2 relative overflow-hidden bg-white border border-orange-100">
              <div className="aspect-square rounded-xl overflow-hidden relative">
                <Image src={item.previewObjectUrl} alt={item.fileName} fill className="object-cover opacity-70" unoptimized />
                <div className="absolute inset-0 bg-charcoal/45 flex flex-col items-center justify-center gap-2 text-white">
                  <div className="text-[11px] font-black uppercase">{item.status}</div>
                  <div className="w-20 h-1.5 bg-white/25 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${item.progress}%` }} />
                  </div>
                  <div className="text-[10px] font-bold">{item.progress}%</div>
                  {item.status === "uploading" && (
                    <button onClick={() => cancelUpload(item.id)} className="text-[10px] px-2 py-1 rounded bg-red-500/80">Cancel</button>
                  )}
                  {item.status === "failed" && (
                    <button onClick={() => retryUpload(item.id)} className="text-[10px] px-2 py-1 rounded bg-orange-500">Retry</button>
                  )}
                </div>
              </div>
              <div className="mt-2 px-1">
                <p className="text-[8px] font-black text-muted truncate uppercase tracking-tighter">{item.fileName}</p>
              </div>
            </ClayCard>
          ))}
          {eventUploads.length > 12 && (
            <ClayCard className="p-4 flex flex-col items-center justify-center text-center bg-orange-50/50 border border-dashed border-orange-200">
              <span className="text-xl font-black text-orange-600">+{eventUploads.length - 12}</span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">More in Queue</span>
            </ClayCard>
          )}
          {photos.slice(0, visibleCount).map((photo, index) => (
            <GalleryPhotoCard
              key={photo.id}
              photo={photo}
              index={index}
              eventId={eventId}
              handleSetThumbnail={handleSetThumbnail}
              handleDeletePhoto={handleDeletePhoto}
            />
          ))}
        </div>
      )}
      {visibleCount < photos.length && (
        <div id="load-more-dashboard-trigger" className="h-20 w-full flex items-center justify-center py-6">
          <Icons.Loader size={28} className="text-orange-500" />
        </div>
      )}
    </div>
  );
}

