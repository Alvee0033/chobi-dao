import Image from "next/image";
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { createEvent, createEventCoverUploadUrl, createUploadUrl, disconnectGoogleDrive, finalizeUpload, getApiBaseUrl, getEvent, getEventIndexStatus, getEventPeople, getEventQr, getEvents, getGoogleConnectUrl, refreshToken, updateEvent, deleteEvent, getEventPhotos, deletePhoto, retryPhoto, getPhotographerAnalytics, type EventPayload, type EventIndexStatus, type EventPhoto, type EventPerson, type PhotographerAnalytics } from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "../icons";
import type { DashboardAuthState, ShowToast, ViewSetter } from "../types";
import { ClayButton } from "../ui/ClayButton";
import { ClayCard } from "../ui/ClayCard";
import "./dashboard-page.css";

type TabId = "events" | "analytics" | "settings";
type UploadItem = {
  id: string;
  photoId?: string;
  eventId: string;
  file: File;
  fileName: string;
  previewObjectUrl: string;
  progress: number;
  status: "queued" | "uploading" | "processing" | "ready" | "failed" | "canceled";
  fileHash?: string;
  error?: string;
  abort?: AbortController;
};

function parseDashboardPath(pathname: string): { tab: TabId; eventId: string | null; gallery: boolean; showNew: boolean } {
  if (pathname.startsWith("/dashboard/analytics")) return { tab: "analytics", eventId: null, gallery: false, showNew: false };
  if (pathname.startsWith("/dashboard/settings")) return { tab: "settings", eventId: null, gallery: false, showNew: false };
  if (pathname.startsWith("/dashboard/events/new")) return { tab: "events", eventId: null, gallery: false, showNew: true };
  const eventPhotosMatch = pathname.match(/^\/dashboard\/events\/([^/]+)\/(photos|upload)$/);
  if (eventPhotosMatch) return { tab: "events", eventId: decodeURIComponent(eventPhotosMatch[1]), gallery: true, showNew: false };
  const eventQrMatch = pathname.match(/^\/dashboard\/events\/([^/]+)\/qr$/);
  if (eventQrMatch) return { tab: "events", eventId: decodeURIComponent(eventQrMatch[1]), gallery: false, showNew: false };
  const eventMatch = pathname.match(/^\/dashboard\/events\/([^/]+)$/);
  if (eventMatch) return { tab: "events", eventId: decodeURIComponent(eventMatch[1]), gallery: false, showNew: false };
  return { tab: "events", eventId: null, gallery: false, showNew: false };
}

function NavItem({ 
  id, 
  Icon, 
  label, 
  activeTab, 
  setActiveTab 
}: { 
  id: TabId; 
  Icon: any; 
  label: string; 
  activeTab: TabId; 
  setActiveTab: (id: TabId) => void 
}) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm transition-all duration-300 ${
        isActive 
          ? "bg-orange-500 text-white shadow-clay-pressed scale-[1.02]" 
          : "text-muted hover:bg-orange-50 hover:text-orange-500"
      }`}
    >
      <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
      <span>{label}</span>
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
    </button>
  );
}

function EventCard({
  event,
  onView,
  onDelete,
}: {
  event: EventPayload;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="studio-event-card" data-testid="event-card">
      <button className="studio-event-card-main" type="button" onClick={onView} aria-label={`Manage ${event.name}`}>
        <div className="studio-event-card-cover">
          {event.thumbnailUrl ? <img src={event.thumbnailUrl} alt="" /> : <div className="studio-event-card-placeholder"><Icons.Camera size={30} /></div>}
        </div>
        <div className="studio-event-card-content">
          <div className="studio-event-card-top"><span className={`studio-event-status studio-event-status-${event.status}`}>{event.status}</span><span className="studio-event-count"><Icons.Image size={14} /> {event.totalPhotos || 0} photos</span></div>
          <h3>{event.name}</h3>
          <div className="studio-event-card-meta"><span><Icons.Calendar size={14} />{event.eventDate ? new Date(event.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Date to be set"}</span><span><Icons.MapPin size={14} />{event.location || "Location to be set"}</span></div>
          <span className="studio-event-card-link">Manage event <Icons.ChevronRight size={16} /></span>
        </div>
      </button>
      <button className="studio-event-card-delete" type="button" onClick={onDelete} aria-label={`Delete ${event.name}`} title="Delete event"><Icons.Trash size={16} /></button>
    </article>
  );
}

function EventDetailView({ 
  eventId, 
  onBack, 
  events, 
  showToast, 
  withRefresh,
  enqueuePhotoUploads,
  uploadingEventId,
  onRequestDelete,
  onEditDetails,
  handleSetThumbnail,
  uploadCoverForEvent,
  origin,
  onPrint,
  onOpenGallery
}: { 
  eventId: string; 
  onBack: () => void;
  events: EventPayload[];
  showToast: ShowToast;
  withRefresh: <T,>(fn: (token: string) => Promise<T>) => Promise<T>;
  enqueuePhotoUploads: (eventId: string, files: File[]) => void;
  uploadingEventId: string | null;
  onRequestDelete: (eventId: string, onSuccess?: () => void) => void;
  onEditDetails: (event: EventPayload) => void;
  handleSetThumbnail: (eventId: string, url: string) => Promise<void>;
  uploadCoverForEvent: (eventId: string, file: File) => Promise<void>;
  origin: string;
  onPrint: () => void;
  onOpenGallery: () => void;
}) {
  const event = events.find(e => e.id === eventId);
  const [copied, setCopied] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventPayload | null>(null);
  const [indexStatus, setIndexStatus] = useState<EventIndexStatus | null>(null);
  const [qrData, setQrData] = useState<string>("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [ev, stats, qr] = await Promise.all([
          withRefresh((token) => getEvent(token, eventId)),
          withRefresh((token) => getEventIndexStatus(token, eventId)),
          withRefresh((token) => getEventQr(token, eventId))
        ]);
        if (!active) return;
        setDetailEvent(ev);
        setIndexStatus(stats);
        
        // Handle case where base64 might already have prefix
        const rawData = qr.pngBase64;
        const formattedQr = rawData.startsWith("data:") ? rawData : `data:image/png;base64,${rawData}`;
        setQrData(formattedQr);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Failed to load event details");
      }
    };
    load();
    return () => { active = false; };
  }, [eventId]);

  if (!event && !detailEvent) return null;
  const currentEvent = event ?? detailEvent!;
  const publicLink = `${origin}/e/${currentEvent.slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    showToast("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    if (!qrData) return;
    const a = document.createElement("a");
    a.href = qrData;
    a.download = `${currentEvent.slug}-qr.png`;
    a.click();
  };

  const shareByEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(`${currentEvent.name} photo gallery`)}&body=${encodeURIComponent(`Here is the event gallery link: ${publicLink}`)}`;
  };

  return (
    <div className="studio-event-detail max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="studio-event-detail-head flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-4 md:gap-6">
        <div className="hidden lg:flex items-center gap-4 md:gap-6 min-w-0">
          <button 
            onClick={onBack}
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border border-orange-100 flex items-center justify-center text-orange-500 shadow-clay-card hover:scale-110 active:scale-95 transition-all shrink-0"
          >
            <Icons.ChevronRight className="w-5 h-5 md:w-6 md:h-6 rotate-180" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-black text-charcoal flex items-center gap-2 md:gap-3 flex-nowrap overflow-hidden">
              <span className="truncate">{currentEvent.name}</span>
              <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-lg md:xl bg-orange-100 text-orange-600 text-[8px] md:text-[10px] font-black uppercase tracking-wider border border-orange-200 shrink-0">
                {currentEvent.status}
              </span>
            </h1>
            <p className="text-muted text-[10px] md:text-sm font-medium">Events &bull; {currentEvent.id.slice(0, 8)}</p>
          </div>
        </div>
        
        <div className="flex gap-2 md:gap-3 w-full lg:w-auto">
          <ClayButton 
            primary={false}
            onClick={() => onRequestDelete(currentEvent.id, onBack)}
            className="flex-1 md:flex-none !rounded-xl md:!rounded-2xl !py-2.5 md:!py-3 !px-4 md:!px-6 !text-red-500 hover:!bg-red-50 border-red-100 shadow-clay-card font-black text-[10px] md:text-xs"
          >
            <Icons.Trash className="w-3.5 h-3.5" /> Delete
          </ClayButton>
          <ClayButton 
            onClick={() => window.open(publicLink, "_blank")}
            className="flex-1 md:flex-none !rounded-xl md:!rounded-2xl !py-2.5 md:!py-3 !px-4 md:!px-6 shadow-clay-pressed font-black text-[10px] md:text-xs flex items-center justify-center gap-2"
          >
            Live Site <Icons.ExternalLink size={12} />
          </ClayButton>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Management */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
             {[
               { label: "Photos", value: indexStatus?.total ?? currentEvent.totalPhotos ?? 0, icon: Icons.Image, color: "bg-orange-500" },
               { label: "Indexed", value: indexStatus?.indexed ?? 0, icon: Icons.CheckCircle, color: "bg-blue-500" },
               { label: "In Queue", value: indexStatus?.inProgress ?? 0, icon: Icons.Upload, color: "bg-green-500" },
               { label: "Failed", value: indexStatus?.failed ?? 0, icon: Icons.FaceId, color: "bg-purple-500" },
             ].map((stat, i) => (
               <ClayCard key={i} className="p-3 md:p-4 border-orange-50 bg-white/50">
                  <div className={`w-7 h-7 md:w-8 md:h-8 ${stat.color} rounded-lg mb-2 md:mb-3 flex items-center justify-center text-white shadow-sm`}>
                     <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <p className="text-[8px] md:text-[10px] font-black text-muted uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                  <p className="text-lg md:text-xl font-black text-charcoal">{stat.value}</p>
               </ClayCard>
             ))}
          </div>

          {/* Photo Gallery Access Card */}
          <ClayCard className="p-5 md:p-8 border-orange-100 shadow-clay-card bg-white/80 backdrop-blur-sm relative overflow-hidden group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                  <Icons.Image className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-charcoal leading-tight">Photo Gallery</h3>
                  <p className="text-[10px] md:text-xs text-muted font-bold uppercase tracking-widest mt-0.5">Manage & View All Assets</p>
                </div>
              </div>
              <ClayButton 
                onClick={onOpenGallery}
                className="!py-2.5 md:!py-3 !px-6 md:!px-8 !rounded-xl md:!rounded-2xl shadow-clay-pressed font-black text-xs md:text-sm flex items-center justify-center gap-2 group-hover:scale-[1.02] transition-all"
              >
                Open Gallery <Icons.ChevronRight size={16} />
              </ClayButton>
            </div>
            

            {/* Subtle background pattern/accent */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors" />
          </ClayCard>

          {/* Details & Thumbnail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <ClayCard className="p-5 md:p-8 border-orange-100 shadow-clay-card">
               <h3 className="text-base md:text-lg font-black text-charcoal mb-3 md:mb-4 flex items-center gap-2">
                 <Icons.MapPin size={16} className="text-orange-500 md:w-[18px] md:h-[18px]" /> Event Details
               </h3>
               <div className="space-y-3 md:space-y-4">
                 <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-gray-50/50 border border-gray-100">
                   <p className="text-[8px] md:text-[10px] font-black text-muted uppercase tracking-widest mb-0.5 md:mb-1">Venue & Location</p>
                   <p className="text-xs md:text-sm font-bold text-charcoal">{currentEvent.location || "Not specified"}</p>
                 </div>
                 <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-gray-50/50 border border-gray-100">
                   <p className="text-[8px] md:text-[10px] font-black text-muted uppercase tracking-widest mb-0.5 md:mb-1">Scheduled Date</p>
                   <p className="text-xs md:text-sm font-bold text-charcoal">{currentEvent.eventDate ? new Date(currentEvent.eventDate).toLocaleDateString(undefined, { dateStyle: 'full' }) : "Not scheduled"}</p>
                 </div>
                 <div className="flex gap-2">
                    <ClayButton primary={false} onClick={() => onEditDetails(currentEvent)} className="flex-1 !py-2 md:!py-2.5 !text-[9px] md:!text-[10px] !rounded-xl font-black uppercase tracking-wider border-orange-100">
                       <Icons.Edit size={12} className="mr-2" /> Edit Details
                    </ClayButton>
                 </div>
               </div>
             </ClayCard>

             <ClayCard className="p-5 md:p-8 border-orange-100 shadow-clay-card overflow-hidden relative">
               <div className="flex items-center justify-between mb-3 md:mb-4">
                 <h3 className="text-base md:text-lg font-black text-charcoal flex items-center gap-2">
                   <Icons.Camera size={16} className="text-orange-500 md:w-[18px] md:h-[18px]" /> Cover Asset
                 </h3>
                 <label className="text-[9px] md:text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline cursor-pointer">
                    Change
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadCoverForEvent(currentEvent.id, file).catch((error) =>
                            showToast(error instanceof Error ? error.message : "Cover upload failed")
                          );
                        }
                      }}
                    />
                 </label>
               </div>
               <div className="relative group rounded-xl md:rounded-2xl overflow-hidden border border-orange-100 aspect-video bg-orange-50 shadow-inner">
                 {currentEvent.thumbnailUrl ? (
                   <img src={currentEvent.thumbnailUrl} alt="Cover" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-orange-200 gap-1.5 md:gap-2">
                     <Icons.Image size={24} className="opacity-20 md:w-8 md:h-8" />
                     <span className="text-[8px] md:text-[10px] font-black uppercase tracking-tighter opacity-30">No Cover Set</span>
                   </div>
                 )}
               </div>
               <p className="text-[8px] md:text-[9px] text-muted font-bold mt-3 md:mt-4 italic leading-relaxed">
                 * This image represents your event in the portfolio grid and client login page.
               </p>
             </ClayCard>
          </div>
        </div>

        {/* Right Column: Sharing & QR */}
        <div className="space-y-8">
          <ClayCard className="p-5 md:p-8 border-orange-200 shadow-clay-card bg-white overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-lg md:text-xl font-black text-charcoal mb-4 md:mb-6 flex items-center gap-2">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm">
                  <Icons.QrCode size={16} className="md:w-[18px] md:h-[18px]" />
                </div>
                Event Access
              </h3>
              
              <div className="bg-orange-50/50 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border-2 border-orange-100/50 shadow-inner flex items-center justify-center mb-6 md:mb-8 mx-auto w-fit group cursor-pointer hover:scale-[1.02] transition-all relative">
                 <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-75 group-hover:scale-110 transition-transform" />
                 {qrData ? (
                   <div className="relative p-3 md:p-4 bg-white rounded-2xl md:rounded-3xl shadow-clay-pressed border border-orange-100">
                     <img src={qrData} alt={`QR for ${currentEvent.slug}`} className="w-32 h-32 md:w-40 md:h-40 object-contain" />
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl shadow-lg border-2 border-orange-500 flex items-center justify-center">
                        <Icons.Camera className="text-orange-500 w-4 h-4 md:w-5 md:h-5" />
                     </div>
                   </div>
                 ) : (
                   <div className="w-40 h-40 md:w-48 md:h-48 bg-white/50 rounded-2xl md:rounded-3xl flex items-center justify-center text-orange-200 border border-orange-100/50 animate-pulse">
                     <Icons.QrCode size={64} className="opacity-20 md:w-20 md:h-20" />
                   </div>
                 )}
              </div>
              
              <div className="space-y-2 md:space-y-3">
                 <ClayButton onClick={downloadQr} className="w-full !rounded-xl md:!rounded-2xl !py-3 md:!py-4 font-black shadow-clay-pressed text-xs md:text-sm">
                   Download QR Kit
                 </ClayButton>
                 <button 
                   onClick={onPrint} 
                   className="w-full py-1.5 md:py-2 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted hover:text-orange-500 transition-colors flex items-center justify-center gap-2 border border-orange-100 rounded-xl hover:bg-orange-50/50"
                 >
                   <Icons.QrCode size={12} className="md:w-3.5 md:h-3.5 text-orange-500" /> QR Code Banner / Print Poster
                 </button>
              </div>
            </div>
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl" />
          </ClayCard>

          <ClayCard className="p-5 md:p-8 border-orange-100 shadow-clay-card bg-white">
            <h3 className="text-base md:text-lg font-black text-charcoal mb-3 md:mb-4 flex items-center gap-2">
               <Icons.ExternalLink size={16} className="text-blue-500 md:w-[18px] md:h-[18px]" /> Sharing Link
            </h3>
            <div className="bg-orange-50 rounded-xl md:rounded-2xl p-3 md:p-4 border border-orange-100 break-all mb-3 md:mb-4 relative group">
              <code className="text-[9px] md:text-[11px] font-black text-orange-600 block pr-8 leading-relaxed select-all">{publicLink}</code>
              <button 
                onClick={copyToClipboard}
                className={`absolute top-3 md:top-4 right-3 md:right-4 transition-all ${copied ? "text-green-500 scale-125" : "text-orange-500 hover:scale-110"}`}
              >
                {copied ? <Icons.CheckCircle size={14} className="md:w-4 md:h-4" /> : <Icons.Copy size={14} className="md:w-4 md:h-4" />}
              </button>
            </div>
            <div className="flex flex-col gap-1.5 md:gap-2">
               <p className="text-[8px] md:text-[10px] text-muted font-black leading-relaxed uppercase tracking-widest">
                 Direct client delivery portal
               </p>
               <div className="flex gap-2 pt-1 md:pt-2">
                  <button onClick={shareByEmail} title="Share by email" className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 border border-green-100 hover:scale-110 transition-transform"><Icons.MessageSquare size={12} className="md:w-3.5 md:h-3.5" /></button>
                  <button onClick={() => window.open(publicLink, "_blank")} title="Open live gallery" className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 hover:scale-110 transition-transform"><Icons.Users size={12} className="md:w-3.5 md:h-3.5" /></button>
                  <button onClick={copyToClipboard} title="Copy link" className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 hover:scale-110 transition-transform"><Icons.MoreHorizontal size={12} className="md:w-3.5 md:h-3.5" /></button>
               </div>
            </div>
          </ClayCard>
        </div>
      </div>
    </div>
  );
}

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
          loading={index < 12 ? "eager" : "lazy"}
          decoding="async"
          // @ts-ignore
          fetchpriority={index < 12 ? "high" : "auto"}
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

const localPreviewCache: Record<string, string> = {};

function PhotoGalleryView({ 
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
  const [visibleCount, setVisibleCount] = useState(24);

  // Reset visible count if selected person or eventId changes
  useEffect(() => {
    setVisibleCount(24);
  }, [eventId, selectedPersonId]);

  useEffect(() => {
    if (visibleCount >= photos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 24, photos.length));
        }
      },
      { threshold: 0.1, rootMargin: "600px" }
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

  // Prefetch the next page of thumbnails in the background when idle
  useEffect(() => {
    if (photos.length <= visibleCount) return;
    
    const prefetchBatch = photos.slice(visibleCount, visibleCount + 24);
    const timeoutId = setTimeout(() => {
      prefetchBatch.forEach((photo) => {
        const candidates = resolveThumbCandidates(photo);
        const src = candidates[0];
        if (src) {
          const img = new window.Image();
          img.src = src;
        }
      });
    }, 800); // Wait 800ms to let page rendering settle first

    return () => clearTimeout(timeoutId);
  }, [visibleCount, photos]);

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
    const candidates = [localPreviewCache[photo.id], photo.thumbUrl, photo.thumbSmallUrl, photo.thumbMediumUrl, photo.url].filter(Boolean) as string[];
    return [...new Set(candidates)];
  };

  const loadPhotos = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await withRefresh((token) => getEventPhotos(token, eventId, true, selectedPersonId ?? undefined));
      setPhotos(data);
      data.slice(0, 8).forEach((photo) => {
        const src = resolveThumbCandidates(photo)[0];
        const img = new window.Image();
        img.src = src;
      });
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

export function DashboardPage({ setView, showToast, auth, onAuth }: { setView: ViewSetter; showToast: ShowToast; auth: DashboardAuthState | null; onAuth: (state: DashboardAuthState | null) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const routeState = parseDashboardPath(pathname || "/dashboard");
  const publicOrigin = typeof window !== "undefined"
    ? (window.location.hostname.includes("jantrasoft.online") || window.location.hostname.includes("sslip.io")
        ? "https://chobidao.jantrasoft.online"
        : window.location.origin)
    : "https://chobidao.jantrasoft.online";
  const origin = publicOrigin;
  const [activeTab, setActiveTab] = useState<TabId>(routeState.tab);
  const [showNewEvent, setShowNewEvent] = useState(routeState.showNew);
  const [isViewingGallery, setIsViewingGallery] = useState(routeState.gallery);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<PhotographerAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [showQrBannerModal, setShowQrBannerModal] = useState<boolean>(false);
  const [events, setEvents] = useState<EventPayload[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDetails, setEventDetails] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(routeState.eventId);
  const [uploadingEventId, setUploadingEventId] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const uploadQueueRef = useRef<UploadItem[]>([]);
  const uploadWorkersRef = useRef(0);
  const claimedUploadsRef = useRef<Set<string>>(new Set());
const MAX_PARALLEL_UPLOADS = 4;
const DIRECT_UPLOAD_MAX_BYTES = 2.5 * 1024 * 1024;

async function optimizeImageForDirectUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= DIRECT_UPLOAD_MAX_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2400;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      bitmap.close();
      return file;
    }
    // High quality bicubic filtering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const outputType = "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, 0.85),
    );
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  }
}
  const [newEventPublicLink, setNewEventPublicLink] = useState("");
  const [newEventQr, setNewEventQr] = useState("");
  const [eventBanner, setEventBanner] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ eventId: string; onSuccess?: () => void } | null>(null);
  const [qrDataForPrint, setQrDataForPrint] = useState<string>("");
  const [settingsState, setSettingsState] = useState({
    publicProfile: true,
    emailNotifications: false,
    autoOptimization: true
  });
  const isDriveConnected = true;
  const resolveDriveConnected = (..._args: any[]) => true;

  const startGoogleConnect = () => {
    window.location.href = getGoogleConnectUrl(auth?.accessToken);
  };

  const handleSharePerson = (personId: string) => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    if (!selectedEvent) return;
    const shareLink = `${origin}/e/${selectedEvent.slug}/photos?personId=${personId}`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator.share({ title: `${selectedEvent.name} photos`, url: shareLink })
        .catch(() => {});
      return;
    }
    navigator.clipboard.writeText(shareLink).then(() => {
      showToast("Person sharing link copied to clipboard!");
    }).catch(() => {
      showToast("Failed to copy sharing link");
    });
  };

  const handleCopyPersonLink = (personId: string) => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    if (!selectedEvent) return;
    const shareLink = `${origin}/e/${selectedEvent.slug}/photos?personId=${personId}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      showToast("Person link copied");
    }).catch(() => {
      showToast("Failed to copy link");
    });
  };

  const ensureDriveConnected = (): boolean => true;


  useEffect(() => {
    const next = parseDashboardPath(pathname || "/dashboard");
    setActiveTab(next.tab);
    setSelectedEventId(next.eventId);
    setIsViewingGallery(next.gallery);
    setShowNewEvent(next.showNew);
  }, [pathname]);

  const computeFileHash = async (file: File): Promise<string | undefined> => {
    if (typeof window === "undefined" || !window.crypto?.subtle) return undefined;
    const buffer = await file.arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  useEffect(() => {
    if (selectedEventId) {
      withRefresh((token) => getEventQr(token, selectedEventId))
        .then(qr => {
          const rawData = qr.pngBase64;
          const formattedQr = rawData.startsWith("data:") ? rawData : `data:image/png;base64,${rawData}`;
          setQrDataForPrint(formattedQr);
        })
        .catch(() => {});
    } else {
      setQrDataForPrint("");
    }
  }, [selectedEventId]);

  const refreshPromiseRef = useRef<Promise<string> | null>(null);
  const withRefresh = async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
    if (!auth) throw new Error("Not authenticated");
    try {
      return await fn(auth.accessToken);
    } catch (error) {
      const errStr = error instanceof Error ? error.message : String(error);
      if (errStr.includes("401") || errStr.toLowerCase().includes("invalid token") || errStr.toLowerCase().includes("unauthorized")) {
        if (!refreshPromiseRef.current) {
          refreshPromiseRef.current = (async () => {
            try {
              const refreshed = await refreshToken(auth.refreshToken);
              onAuth({
                ...auth,
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
                userId: refreshed.photographer.id,
                email: refreshed.photographer.email,
                name: refreshed.photographer.name,
                plan: refreshed.photographer.plan,
                hasDriveConnected: resolveDriveConnected(refreshed.photographer, Boolean(auth.hasDriveConnected)),
                driveRootFolderId: refreshed.photographer.driveRootFolderId ?? auth.driveRootFolderId ?? null,
              });
              return refreshed.accessToken;
            } finally {
              refreshPromiseRef.current = null;
            }
          })();
        }
        const newAccessToken = await refreshPromiseRef.current;
        return await fn(newAccessToken);
      }
      throw error;
    }
  };

  useEffect(() => {
    if (auth) {
      withRefresh((token) => getEvents(token)).then(setEvents).catch(console.error);
    }
  }, [auth]);

  useEffect(() => {
    if (auth && activeTab === "analytics") {
      setIsLoadingAnalytics(true);
      withRefresh((token) => getPhotographerAnalytics(token))
        .then(setAnalyticsData)
        .catch(console.error)
        .finally(() => setIsLoadingAnalytics(false));
    }
  }, [auth, activeTab]);

  const handleTabChange = (tab: TabId) => {
    if (tab === "analytics") router.push("/dashboard/analytics");
    else if (tab === "settings") router.push("/dashboard/settings");
    else router.push("/dashboard");
    setMobileMenuOpen(false);
  };

  const handleOpenNewEvent = () => {
    if (!ensureDriveConnected()) return;
    router.push("/dashboard/events/new");
    setEditingEventId(null);
    setMobileMenuOpen(false);
    setShowNewEvent(true);
  };

  const resetEventForm = () => {
    setEditingEventId(null);
    setEventName("");
    setEventDetails("");
    setEventLocation("");
    setEventDate("");
    setEventBanner(null);
    setBannerPreview(null);
    setNewEventPublicLink("");
    setNewEventQr("");
  };

  const handleStartEditEvent = (event: EventPayload) => {
    setEditingEventId(event.id);
    setEventName(event.name ?? "");
    setEventDetails(event.details ?? "");
    setEventLocation(event.location ?? "");
    setEventDate(event.eventDate ? event.eventDate.slice(0, 10) : "");
    setEventBanner(null);
    setBannerPreview(event.thumbnailUrl ?? null);
    setShowNewEvent(true);
  };

  const runUploadWorkers = async () => {
    while (uploadWorkersRef.current < MAX_PARALLEL_UPLOADS) {
      const next = uploadQueueRef.current.find((item) => item.status === "queued" && !claimedUploadsRef.current.has(item.id));
      if (!next) break;

      claimedUploadsRef.current.add(next.id);
      uploadWorkersRef.current += 1;
      const uploadId = next.id;
      const controller = new AbortController();

      setUploadQueue((prev) => prev.map((item) => item.id === uploadId ? { ...item, status: "uploading", progress: 0, abort: controller } : item));
      setUploadingEventId(next.eventId);

      (async () => {
        try {
          const uploadFile = await optimizeImageForDirectUpload(next.file);
          const presign = await withRefresh((token) =>
            createUploadUrl(
              token,
              next.eventId,
              uploadFile.name,
              uploadFile.type || "image/jpeg",
              uploadFile.size,
            ),
          );

          setUploadQueue((prev) => prev.map((item) => item.id === uploadId ? { ...item, photoId: presign.photoId } : item));
          if (presign.photoId && next.previewObjectUrl) {
            localPreviewCache[presign.photoId] = next.previewObjectUrl;
          }

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", presign.uploadUrl);
            const headerEntries = Object.entries(presign.requiredHeaders || {});
            for (const [key, value] of headerEntries) xhr.setRequestHeader(key, value);
            xhr.upload.onprogress = (evt) => {
              if (!evt.lengthComputable) return;
              const progress = Math.max(1, Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
              setUploadQueue((prev) => prev.map((item) => item.id === uploadId ? { ...item, progress } : item));
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Upload failed (${xhr.status})`));
            };
            xhr.onerror = () => reject(new Error("Network error during upload"));
            controller.signal.addEventListener("abort", () => {
              xhr.abort();
              reject(new Error("Upload canceled"));
            });
            xhr.send(uploadFile);
          });

          setUploadQueue((prev) => prev.map((item) => item.id === uploadId ? { ...item, status: "processing", progress: 100 } : item));
          await withRefresh((token) => finalizeUpload(token, next.eventId, [presign.photoId]));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Upload failed";
          setUploadQueue((prev) => prev.map((item) => item.id === uploadId ? { ...item, status: msg.includes("canceled") ? "canceled" : "failed", error: msg } : item));
          if (!msg.includes("canceled")) showToast(`Upload failed: ${msg}`);
        } finally {
          claimedUploadsRef.current.delete(uploadId);
          uploadWorkersRef.current -= 1;
          if (uploadWorkersRef.current === 0) {
            setUploadingEventId(null);
            withRefresh((token) => getEvents(token)).then(setEvents).catch(() => {});
          }
          setUploadQueue((prev) => prev.filter((item) => item.id !== uploadId));
          // Trigger next in queue
          void runUploadWorkers();
        }
      })();
    }
  };

  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
    if (uploadQueue.some((item) => item.status === "queued") && uploadWorkersRef.current < MAX_PARALLEL_UPLOADS) {
      void runUploadWorkers();
    }
  }, [uploadQueue]);

  const enqueuePhotoUploads = (eventId: string, files: File[]) => {
    if (!ensureDriveConnected()) return;
    if (!files.length) return;
    setUploadQueue((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        eventId,
        file,
        fileName: file.name,
        previewObjectUrl: URL.createObjectURL(file),
        progress: 0,
        status: "queued" as const
      }))
    ]);
    showToast(`Queued ${files.length} file${files.length > 1 ? "s" : ""}`);
  };

  const cancelUpload = (uploadId: string) => {
    setUploadQueue((prev) => {
      const target = prev.find((item) => item.id === uploadId);
      target?.abort?.abort();
      return prev.map((item) => item.id === uploadId ? { ...item, status: "canceled", error: "Canceled by user" } : item);
    });
    claimedUploadsRef.current.delete(uploadId);
  };

  const retryUpload = (uploadId: string) => {
    claimedUploadsRef.current.delete(uploadId);
    setUploadQueue((prev) => prev.map((item) => item.id === uploadId ? { ...item, status: "queued", progress: 0, error: undefined } : item));
  };

  const handleDeleteEvent = async (eventId: string): Promise<boolean> => {
    if (!auth) return false;
    try {
      setLoading(true);
      await withRefresh((token) => deleteEvent(token, eventId));
      setEvents(events.filter(e => e.id !== eventId));
      showToast("Event deleted successfully");
      return true;
    } catch (error) {
      showToast(`Delete failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteEvent = (eventId: string, onSuccess?: () => void) => {
    setDeleteConfirm({ eventId, onSuccess });
  };

  const handleSetThumbnail = async (eventId: string, url: string) => {
    if (!auth) return;
    try {
      await withRefresh((token) => updateEvent(token, eventId, { thumbnailUrl: url }));
      setEvents(events.map(e => e.id === eventId ? { ...e, thumbnailUrl: url } : e));
      showToast("Thumbnail updated");
    } catch (error) {
      showToast("Failed to set thumbnail");
    }
  };

  const uploadCoverForEvent = async (eventId: string, file: File) => {
    if (!ensureDriveConnected()) throw new Error("Google Drive is not connected");
    const presign = await withRefresh((token) => createEventCoverUploadUrl(token, eventId, file.name, file.type));
    const uploadUrl = presign.uploadUrl.startsWith("http")
      ? presign.uploadUrl
      : `${getApiBaseUrl()}${presign.uploadUrl}`;
    const uploadRes = await withRefresh((token) => fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        ...(presign.requiredHeaders || {}),
        "Content-Type": file.type || "application/octet-stream",
        Authorization: `Bearer ${token}`,
      }
    }).then((res) => {
      if (!res.ok) throw new Error(`Cover upload failed (${res.status})`);
      return res;
    }));
    if (!uploadRes.ok) throw new Error(`Cover upload failed (${uploadRes.status})`);
    const uploaded = await uploadRes.json().catch(() => ({} as { coverPhotoKey?: string }));
    const coverKey = uploaded.coverPhotoKey ?? presign.key;
    const updatedEvent = await withRefresh((token) => updateEvent(token, eventId, { thumbnailUrl: coverKey }));
    setEvents((prev) => prev.map((event) => event.id === eventId ? { ...event, ...updatedEvent } : event));
    showToast("Cover updated");
  };

  const handleCreateEvent = async () => {
    if (!auth) return;
    if (!ensureDriveConnected()) return;
    if (!eventName.trim()) {
      showToast("Event name is required");
      return;
    }

    try {
      setLoading(true);
      if (editingEventId) {
        await withRefresh((token) => updateEvent(token, editingEventId, {
          name: eventName.trim(),
          details: eventDetails.trim() || undefined,
          location: eventLocation.trim() || undefined,
          eventDate: eventDate || undefined
        }));

        if (eventBanner) {
          await uploadCoverForEvent(editingEventId, eventBanner);
        }

        const refreshedEvents = await withRefresh((token) => getEvents(token));
        setEvents(refreshedEvents);
        setShowNewEvent(false);
        resetEventForm();
        showToast("Event updated successfully");
        router.push(`/dashboard/events/${encodeURIComponent(editingEventId)}`);
        return;
      }

      const created = await withRefresh((token) => createEvent(token, {
        name: eventName.trim(),
        details: eventDetails.trim() || undefined,
        location: eventLocation.trim() || undefined,
        eventDate: eventDate || undefined
      }));

      // If banner is selected, upload it and set as thumbnail
      if (eventBanner) {
        try {
          await uploadCoverForEvent(created.id, eventBanner);
        } catch (bannerError) {
          console.error("Failed to upload banner:", bannerError);
          showToast("Event created, but banner upload failed");
        }
      }

      setNewEventPublicLink(created.publicUrl);
      setNewEventQr(created.qr.pngBase64);
      setEvents(await withRefresh((token) => getEvents(token)));
      setEditingEventId(null);
      setEventName("");
      setEventDetails("");
      setEventLocation("");
      setEventDate("");
      setEventBanner(null);
      setBannerPreview(null);
      setShowNewEvent(false);
      showToast("Event created successfully");
      router.push(`/dashboard/events/${encodeURIComponent(created.id)}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!auth) return;
    try {
      await withRefresh((token) => disconnectGoogleDrive(token));
      onAuth({
        ...auth,
        hasDriveConnected: false,
        driveRootFolderId: null,
      });
      showToast("Google Drive disconnected");
      if (showNewEvent) {
        setShowNewEvent(false);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to disconnect Google Drive");
    }
  };

  const AnalyticsSection = () => {
    if (isLoadingAnalytics) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-orange-500">
          <Icons.Loader className="w-8 h-8 animate-spin" />
          <span className="text-sm font-bold">Loading real-time analytics...</span>
        </div>
      );
    }

    const data = analyticsData || {
      totalViews: 0,
      uniqueUsers: 0,
      photosDelivered: 0,
      totalPhotos: 0,
      monthlyViews: Array(12).fill(0),
      monthlyInteractions: Array(12).fill(0),
      trends: { views: "+0%", users: "+0%", photos: "+0%" }
    };

    const maxVal = Math.max(...data.monthlyViews, ...data.monthlyInteractions, 10);

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Views", value: data.totalViews.toLocaleString(), icon: Icons.Eye, color: "bg-blue-500", trend: data.trends.views },
            { label: "Unique Users", value: data.uniqueUsers.toLocaleString(), icon: Icons.Users, color: "bg-purple-500", trend: data.trends.users },
            { label: "Photos Delivered", value: data.photosDelivered.toLocaleString(), icon: Icons.Image, color: "bg-green-500", trend: data.trends.photos }
          ].map((stat, i) => (
            <ClayCard key={i} className="p-6 border-orange-100 shadow-clay-card hover:scale-[1.02] transition-all group overflow-hidden relative">
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-white shadow-clay-pressed group-hover:rotate-6 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted uppercase tracking-[0.1em] mb-0.5">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                     <p className="text-2xl font-black text-charcoal">{stat.value}</p>
                     <span className={`text-[10px] font-black ${stat.trend.startsWith("-") ? "text-red-500" : "text-green-500"}`}>{stat.trend}</span>
                  </div>
                </div>
              </div>
              <stat.icon className="absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] text-charcoal -rotate-12" />
            </ClayCard>
          ))}
        </div>

        <ClayCard className="p-8 border-orange-100 shadow-clay-card bg-white overflow-hidden relative">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h3 className="text-xl font-black text-charcoal mb-1">Growth & Traffic</h3>
              <p className="text-xs text-muted font-bold">Audience engagement across all live events</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-[10px] font-black text-blue-600 border border-blue-100">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Views
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-[10px] font-black text-orange-600 border border-orange-100">
                 <div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Interactions
              </div>
            </div>
          </div>
          
          <div className="h-64 w-full flex items-end gap-3 px-2">
            {data.monthlyViews.map((views, i) => {
              const interactions = data.monthlyInteractions[i] || 0;
              const viewsHeight = (views / maxVal) * 100;
              const interactionsHeight = (interactions / maxVal) * 100;

              return (
                <div key={i} className="flex-1 h-full flex items-end gap-1 group relative">
                  <div 
                    style={{ height: `${Math.max(viewsHeight, 2)}%` }} 
                    className="flex-1 bg-blue-100 group-hover:bg-blue-500 rounded-t-md transition-all duration-500 cursor-help"
                  >
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-charcoal text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20 whitespace-nowrap">
                      {views} views, {interactions} matched
                    </div>
                  </div>
                  <div 
                    style={{ height: `${Math.max(interactionsHeight, 2)}%` }} 
                    className="flex-1 bg-orange-100 group-hover:bg-orange-500 rounded-t-md transition-all duration-500 cursor-help"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 px-2 border-t border-orange-50 pt-4">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
              <span key={m} className="text-[10px] font-black text-muted uppercase tracking-tighter">{m}</span>
            ))}
          </div>
        </ClayCard>
      </div>
    );
  };

  const SettingsSection = () => (
    <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ClayCard className="p-8 border-orange-100 shadow-clay-card">
         <div className="flex items-center gap-8 mb-10">
           <div className="w-24 h-24 rounded-[32px] bg-orange-500 flex items-center justify-center text-white text-4xl font-black shadow-clay-pressed border-4 border-white relative group shrink-0">
             {auth?.name?.[0]?.toUpperCase() ?? "U"}
             <button onClick={() => showToast("Profile photo upload is not available yet")} className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-clay-card flex items-center justify-center text-orange-500 hover:scale-110 active:scale-95 transition-all border border-orange-50">
               <Icons.Camera className="w-5 h-5" />
             </button>
           </div>
           <div className="flex-1 min-w-0">
             <h3 className="text-2xl font-black text-charcoal mb-1 truncate">{auth?.name || "Photographer"}</h3>
             <p className="text-muted font-bold text-sm mb-4 truncate">{auth?.email || "No email linked"}</p>
             <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-clay-pressed">
                  Pro Plan
                </span>
                <span className="px-3 py-1 rounded-full bg-white text-charcoal text-[10px] font-black uppercase tracking-widest shadow-clay-card border border-orange-100">
                  Verified
                </span>
             </div>
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-orange-50">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Display Name</label>
              <input type="text" defaultValue={auth?.name ?? ""} className="w-full bg-orange-50/30 border-0 px-4 py-4 rounded-2xl font-bold text-sm shadow-clay-pressed focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Professional Tagline</label>
              <input type="text" placeholder="e.g. Fine Art Wedding Photographer" className="w-full bg-orange-50/30 border-0 px-4 py-4 rounded-2xl font-bold text-sm shadow-clay-pressed focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all" />
           </div>
         </div>
      </ClayCard>

      <div className="grid grid-cols-1 gap-4">
        <ClayCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-orange-100 shadow-clay-card group hover:bg-orange-50/10 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center p-2 shadow-clay-card border border-orange-200 group-hover:scale-110 transition-transform shrink-0">
              <Icons.Zap size={24} />
            </div>
            <div>
              <h4 className="font-black text-charcoal flex items-center gap-2">
                Local Storage Bucket (MinIO / S3)
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h4>
              <p className="text-xs text-muted font-bold mt-0.5">
                Active & High Speed. All photos and WebP thumbnails are stored securely on your server.
              </p>
            </div>
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-100 self-start sm:self-auto">
            100% Local & Fast
          </div>
        </ClayCard>
        {[
          { key: "publicProfile", title: "Public Profile", desc: "Allow others to find your portfolio", icon: Icons.Users },
          { key: "emailNotifications", title: "Email Notifications", desc: "Get notified when clients view photos", icon: Icons.Bell },
          { key: "autoOptimization", title: "Auto-Optimization", desc: "Compress images for faster loading", icon: Icons.Zap },
        ].map((setting, i) => (
          <ClayCard key={i} className="flex items-center justify-between p-6 border-orange-100 shadow-clay-card group hover:bg-orange-50/20 transition-colors">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-orange-500 shadow-clay-card border border-orange-50 group-hover:scale-110 transition-transform">
                <setting.icon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-charcoal">{setting.title}</h4>
                <p className="text-xs text-muted font-bold">{setting.desc}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSettingsState((prev) => {
                  const nextValue = !prev[setting.key as keyof typeof prev];
                  showToast(`${setting.title} ${nextValue ? "enabled" : "disabled"}`);
                  return { ...prev, [setting.key]: nextValue };
                });
              }}
              className={`w-14 h-8 rounded-full transition-all relative ${settingsState[setting.key as keyof typeof settingsState] ? 'bg-orange-500 shadow-clay-pressed' : 'bg-orange-100'}`}
            >
               <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${settingsState[setting.key as keyof typeof settingsState] ? 'right-1' : 'left-1'}`} />
            </button>
          </ClayCard>
        ))}
      </div>

      <div className="pt-8 flex items-center justify-between">
         <ClayButton onClick={() => showToast("Contact support to delete your account")} className="!bg-red-50 !text-red-500 !border-red-100 hover:!bg-red-500 hover:!text-white !shadow-none !rounded-2xl !py-4 px-8 font-black transition-all">
           Delete Account
         </ClayButton>
         <ClayButton onClick={() => showToast("Settings saved")} className="!rounded-2xl !py-4 px-12 shadow-clay-pressed font-black ring-4 ring-orange-100">
           Save Changes
         </ClayButton>
      </div>
    </div>
  );

  const activeEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) : null;
  const subpageTitle = isViewingGallery ? "Photo Gallery" : (activeEvent?.name || "Event Details");

  return (
    <div className="studio-dashboard min-h-screen flex bg-[#faf9f6] w-full relative z-10 font-sans" data-testid="dashboard-page">
      {/* Mobile Header (Dynamic & Context-aware) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-orange-100 z-[60] px-4 flex items-center justify-between">
        {selectedEventId ? (
          <>
            <button 
              onClick={() => {
                if (isViewingGallery) {
                  router.push(`/dashboard/events/${encodeURIComponent(selectedEventId)}`);
                } else {
                  router.push("/dashboard");
                }
              }}
              className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shadow-clay-card border border-orange-100 active:scale-95 transition-all"
            >
              <Icons.ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center px-2 min-w-0">
              <h1 className="font-heading font-black text-charcoal text-sm md:text-base truncate">{subpageTitle}</h1>
            </div>
            <div className="w-10 h-10 flex items-center justify-center">
              {isViewingGallery ? (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) enqueuePhotoUploads(selectedEventId, Array.from(files));
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shadow-clay-card border border-orange-100 active:scale-95 transition-all">
                    <Icons.Plus className="w-5 h-5" />
                  </div>
                </label>
              ) : (
                <button 
                  onClick={() => window.open(`${origin}/e/${activeEvent?.slug}`, "_blank")}
                  className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shadow-clay-card border border-orange-100 active:scale-95 transition-all"
                >
                  <Icons.ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-orange-500 font-heading font-black text-xl">
              <img src="/logo.png" alt="Chobi Dao" className="w-7 h-7 object-contain" />
              <span>Chobi dao</span>
            </div>
            <button 
              onClick={() => handleTabChange("settings")}
              className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-clay-card font-black active:scale-95 transition-all text-xs"
            >
              {auth?.name?.[0]?.toUpperCase() ?? "U"}
            </button>
          </>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div 
        className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-t border-orange-100 flex items-center justify-around px-6 z-[60] transition-transform duration-300 ${
          selectedEventId ? 'translate-y-full' : 'translate-y-0 shadow-[0_-4px_16px_rgba(249,115,22,0.06)]'
        }`}
      >
        {[
          { id: "events" as TabId, label: "Events", Icon: Icons.Camera },
          { id: "analytics" as TabId, label: "Analytics", Icon: Icons.BarChart },
          { id: "settings" as TabId, label: "Settings", Icon: Icons.Settings }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-300 relative ${
                isActive ? "text-orange-500 font-black scale-[1.05]" : "text-muted hover:text-orange-500 font-bold"
              }`}
            >
              <tab.Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] uppercase tracking-tighter">{tab.label}</span>
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-orange-500 rounded-b-md" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar - Desktop Only */}
      <aside className="studio-sidebar hidden lg:flex sticky top-0 left-0 z-[70] h-screen bg-white/95 backdrop-blur-2xl border-r border-orange-100/50 p-6 flex-col gap-8 w-72 shrink-0">
        <div className="flex items-center gap-3 text-orange-500 font-heading font-black text-2xl px-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-clay-card border border-orange-100">
            <img src="/logo.png" alt="Chobi Dao" className="w-8 h-8 object-contain" />
          </div>
          <span className="tracking-tight">Chobi dao</span>
        </div>

        <div className="px-2">
           {isDriveConnected ? (
             <button 
               onClick={handleOpenNewEvent}
               className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-orange-500 text-white font-black text-sm shadow-clay-pressed hover:scale-[1.02] active:scale-95 transition-all group"
             >
               <Icons.Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
               New Event
             </button>
           ) : (
             <button
               onClick={startGoogleConnect}
               className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-sm shadow-clay-pressed hover:scale-[1.02] active:scale-95 transition-all group"
             >
               <div className="w-5 h-5 relative shrink-0">
                 <Image src="/drive.png" alt="Google Drive logo" fill className="object-contain invert brightness-200" />
               </div>
               Connect Drive
             </button>
           )}
        </div>

        <nav className="flex flex-col gap-2 flex-1 px-1">
          <NavItem id="events" Icon={Icons.Camera} label="Events" activeTab={activeTab} setActiveTab={handleTabChange} />
          <NavItem id="analytics" Icon={Icons.BarChart} label="Analytics" activeTab={activeTab} setActiveTab={handleTabChange} />
          <NavItem id="settings" Icon={Icons.Settings} label="Settings" activeTab={activeTab} setActiveTab={handleTabChange} />
        </nav>

        <div className="mt-auto pt-6 border-t border-orange-100/50">
          <ClayCard className="p-4 mb-4 bg-orange-50/50 border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-clay-card border border-orange-50 font-black">
                {auth?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-charcoal truncate">{auth?.name ?? "Photographer"}</p>
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider">{auth?.plan ?? "Free"} Plan</p>
              </div>
            </div>
            <button
              onClick={() => {
                onAuth(null);
                setView("landing");
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs text-orange-500 bg-white hover:bg-orange-500 hover:text-white transition-all shadow-clay-card border border-orange-100"
            >
              <Icons.LogOut className="w-4 h-4" /> Logout
            </button>
          </ClayCard>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`studio-dashboard-main flex-1 px-4 py-6 md:p-8 lg:p-12 pt-20 lg:pt-12 overflow-y-auto transition-all ${
        selectedEventId ? "pb-12" : "pb-24 lg:pb-12"
      }`}>
        {selectedEventId ? (
          isViewingGallery ? (
            <PhotoGalleryView
              eventId={selectedEventId}
              onBack={() => router.push(`/dashboard/events/${encodeURIComponent(selectedEventId)}`)}
              showToast={showToast}
              withRefresh={withRefresh}
              enqueuePhotoUploads={enqueuePhotoUploads}
              handleSetThumbnail={handleSetThumbnail}
              uploadingEventId={uploadingEventId}
              uploadQueue={uploadQueue}
              cancelUpload={cancelUpload}
              retryUpload={retryUpload}
              onSharePerson={handleSharePerson}
              onCopyPersonLink={handleCopyPersonLink}
            />
          ) : (
            <EventDetailView 
              eventId={selectedEventId} 
              onBack={() => {
                router.push("/dashboard");
              }} 
              events={events}
              showToast={showToast}
              withRefresh={withRefresh}
              enqueuePhotoUploads={enqueuePhotoUploads}
              uploadingEventId={uploadingEventId}
              onRequestDelete={requestDeleteEvent}
              onEditDetails={handleStartEditEvent}
              handleSetThumbnail={handleSetThumbnail}
              uploadCoverForEvent={uploadCoverForEvent}
              origin={origin}
              onPrint={() => setShowQrBannerModal(true)}
              onOpenGallery={() => router.push(`/dashboard/events/${encodeURIComponent(selectedEventId)}/photos`)}
            />
          )
        ) : (
          <div className="max-w-5xl mx-auto">
            {/* Floating Action Button */}
            {activeTab === "events" && (
                <div className="fixed bottom-8 right-8 z-50">
                 <ClayButton
                  onClick={handleOpenNewEvent}
                  className="shadow-2xl !rounded-full !w-16 !h-16 !p-0 ring-4 ring-orange-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all bg-orange-500 text-white"
                >
                  <Icons.Plus size={32} />
                </ClayButton>
              </div>
            )}

            {activeTab === "events" ? (
              <div className="space-y-6">
                <div className="studio-page-title"><div><p>Workspace / Events</p><h1>Events <span>{events.length}</span></h1></div></div>
                {/* KPIs - Compact & Side-by-Side */}
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
                  <ClayCard className="studio-kpi flex items-center gap-3 p-3 group hover:scale-[1.02] transition-all bg-white border-orange-100 shadow-clay-card relative overflow-hidden min-h-[80px]">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-clay-pressed border-2 border-white group-hover:rotate-6 transition-transform relative z-10 flex-shrink-0">
                      <Icons.Camera size={18} />
                    </div>
                    <div className="relative z-10 min-w-0">
                      <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-0.5 truncate">Projects</p>
                      <p className="text-xl font-black font-heading text-charcoal leading-none">{events.length}</p>
                    </div>
                    <Icons.Camera className="absolute -right-4 -bottom-4 w-16 h-16 opacity-[0.03] -rotate-12" />
                  </ClayCard>
                  <ClayCard className="studio-kpi flex items-center gap-3 p-3 group hover:scale-[1.02] transition-all bg-white border-blue-100 shadow-clay-card relative overflow-hidden min-h-[80px]">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-clay-pressed border-2 border-white group-hover:-rotate-6 transition-transform relative z-10 flex-shrink-0">
                      <Icons.Image size={18} />
                    </div>
                    <div className="relative z-10 min-w-0">
                      <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-0.5 truncate">Photos</p>
                      <p className="text-xl font-black font-heading text-charcoal leading-none">{events.reduce((acc, e) => acc + (e.totalPhotos || 0), 0)}</p>
                    </div>
                    <Icons.Image className="absolute -right-4 -bottom-4 w-16 h-16 opacity-[0.03] rotate-12" />
                  </ClayCard>
                </div>

                <div className="space-y-4">

                  {/* Search & Filters - Compact & Aligned */}
                  <div className="studio-search-bar flex flex-row gap-2 items-center p-1.5 bg-white rounded-2xl shadow-sm border border-orange-100/50">
                     <div className="relative flex-1">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 w-3.5 h-3.5" />
                        <input 
                           type="text" 
                           placeholder="Search..." 
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="w-full h-10 bg-orange-50/30 border-0 pl-9 pr-4 rounded-xl font-bold text-xs focus:ring-0 placeholder:text-muted/50 transition-all"
                        />
                     </div>
                     <div className="flex gap-1.5">
                        <select 
                           value={filterStatus}
                           onChange={(e) => setFilterStatus(e.target.value)}
                           className="h-10 bg-white border border-orange-100 rounded-xl px-3 font-black text-[10px] uppercase tracking-tighter text-charcoal outline-none shadow-sm cursor-pointer hover:bg-orange-50/50 transition-all appearance-none min-w-[60px] text-center"
                        >
                           <option value="all">ALL</option>
                           <option value="live">LIVE</option>
                           <option value="processing">PROC.</option>
                        </select>
                        <button
                          onClick={() => {
                            const order = ["all", "live", "processing"];
                            const nextValue = order[(order.indexOf(filterStatus) + 1) % order.length];
                            setFilterStatus(nextValue);
                            showToast(`Filter set to ${nextValue}`);
                          }}
                          className="w-10 h-10 bg-white border border-orange-100 rounded-xl text-muted hover:text-orange-500 shadow-sm transition-all flex items-center justify-center shrink-0"
                        >
                           <Icons.Filter size={16} />
                        </button>
                     </div>
                  </div>

                {loading ? (
                  <div className="grid grid-cols-1 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-44 rounded-3xl animate-pulse bg-white border border-orange-100/50 shadow-sm" />
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <ClayCard className="p-8 md:p-16 text-center border-dashed border-4 border-orange-100 bg-orange-50/10 rounded-[32px] md:rounded-[48px]">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white flex items-center justify-center text-orange-200 mx-auto mb-6 shadow-clay-card border border-orange-50">
                      <Icons.Camera className="w-8 h-8 md:w-12 md:h-12" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-charcoal mb-2">Build Your First Gallery</h3>
                    <p className="text-sm md:text-lg text-muted font-medium mb-8 max-w-sm mx-auto leading-relaxed">Create an event, upload your stunning photos, and share a premium experience with your clients instantly.</p>
                    <ClayButton onClick={handleOpenNewEvent} className="w-full md:w-auto !rounded-2xl !py-4 md:!py-5 md:!px-12 shadow-clay-pressed font-black text-base md:text-lg">
                      Create Event Now
                    </ClayButton>
                  </ClayCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="events-list">
                    {events
                      .filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.location?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .filter(e => filterStatus === "all" || e.status === filterStatus)
                      .map((event) => (
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        onView={() => router.push(`/dashboard/events/${encodeURIComponent(event.id)}`)} 
                        onDelete={() => requestDeleteEvent(event.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "analytics" ? (
            <AnalyticsSection />
          ) : (
            <SettingsSection />
          )}
        </div>
      )}
    </main>

      {/* New Event Modal */}
      {showNewEvent && (
        <div className="studio-event-modal fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/20 backdrop-blur-md animate-in fade-in duration-300">
          <ClayCard className="studio-event-modal-card w-full max-w-md p-0 max-h-[90vh] overflow-y-auto animate-[float_0.4s_ease-out_forwards] border-orange-100 shadow-2xl">
            <div className="p-6 border-b border-orange-100 bg-orange-50/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-clay-pressed">
                  <Icons.Camera className="w-6 h-6" />
                </div>
                <h3 className="font-black font-heading text-2xl text-charcoal">{editingEventId ? "Edit Event" : "Create New Event"}</h3>
              </div>
              <p className="text-muted text-xs font-medium uppercase tracking-tight">{editingEventId ? "Update your event details and assets." : "Set up your delivery portal details."}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Event Name *</label>
                  <input
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    type="text"
                    placeholder="e.g. Wedding of Sarah & John"
                    className="w-full h-11 bg-orange-50/50 border-0 px-4 rounded-xl font-bold text-sm shadow-clay-pressed focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all placeholder:text-muted/40"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Location</label>
                    <div className="relative">
                      <Icons.MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500 w-3.5 h-3.5" />
                      <input
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        type="text"
                        placeholder="e.g. Dhaka"
                        className="w-full h-11 bg-orange-50/50 border-0 pl-10 pr-4 rounded-xl font-bold text-sm shadow-clay-pressed focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all placeholder:text-muted/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Date</label>
                    <div className="relative">
                      <Icons.Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500 w-3.5 h-3.5" />
                      <input
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        type="date"
                        className="w-full h-11 bg-orange-50/50 border-0 pl-10 pr-4 rounded-xl font-bold text-sm shadow-clay-pressed focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Additional Details</label>
                  <textarea
                    value={eventDetails}
                    onChange={(e) => setEventDetails(e.target.value)}
                    placeholder="Instructions..."
                    className="w-full h-20 bg-orange-50/50 border-0 px-4 py-3 rounded-xl font-bold text-sm shadow-clay-pressed focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all placeholder:text-muted/40 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Event Banner</label>
                  <div 
                    className="relative h-32 rounded-2xl bg-orange-50/30 border-2 border-dashed border-orange-100 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 transition-all overflow-hidden group shadow-clay-pressed"
                    onClick={() => document.getElementById('banner-upload')?.click()}
                  >
                    {bannerPreview ? (
                      <>
                        <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                          <div className="bg-white p-3 rounded-2xl shadow-clay-card">
                            <Icons.Camera className="w-6 h-6 text-orange-500" />
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventBanner(null);
                            setBannerPreview(null);
                          }}
                          className="absolute top-3 right-3 p-2 bg-white rounded-xl shadow-clay-card text-red-500 hover:scale-110 transition-all border border-orange-50 z-20"
                        >
                          <Icons.Trash className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-6">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-clay-card flex items-center justify-center mx-auto mb-3 text-orange-300 group-hover:scale-110 transition-transform">
                          <Icons.Upload className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Click to upload banner</p>
                        <p className="text-[8px] font-bold text-muted/40 mt-1 uppercase">Best ratio 16:9 • High quality JPG/PNG</p>
                      </div>
                    )}
                    <input 
                      id="banner-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEventBanner(file);
                          setBannerPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {newEventPublicLink && (
                <div className="rounded-2xl border-2 border-green-100 p-4 bg-green-50/50 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 mb-2 text-green-600">
                    <Icons.CheckCircle className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-wider">Success! Link Generated</p>
                  </div>
                  <a className="text-xs text-green-700 font-black break-all block mb-3 hover:underline" href={newEventPublicLink} target="_blank" rel="noreferrer">{`${origin}${newEventPublicLink}`}</a>
                  {newEventQr && (
                    <div className="bg-white p-2 rounded-xl border border-green-100 w-fit">
                      <img alt="Event QR" className="w-24 h-24" src={`data:image/png;base64,${newEventQr}`} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <ClayButton
                primary={false}
                className="flex-1 !py-3.5 !rounded-xl border-orange-100 shadow-clay-card hover:bg-orange-50 text-xs font-black"
                onClick={() => {
                  setShowNewEvent(false);
                  resetEventForm();
                  if ((pathname || "").startsWith("/dashboard/events/new")) {
                    router.push("/dashboard");
                  }
                }}
              >
                Discard
              </ClayButton>
              <ClayButton
                className="flex-1 !py-3.5 !rounded-xl shadow-clay-pressed font-black text-xs ring-4 ring-orange-100"
                onClick={handleCreateEvent}
                disabled={loading}
                data-testid="create-event-submit"
              >
                {loading ? (editingEventId ? "Saving..." : "Creating...") : (editingEventId ? "Save Changes" : "Launch Event")}
              </ClayButton>
            </div>
          </ClayCard>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-charcoal/30 backdrop-blur-sm print:hidden">
          <ClayCard className="w-full max-w-sm p-6 border-orange-100 shadow-2xl">
            <h3 className="text-lg font-black text-charcoal mb-2">Delete this event?</h3>
            <p className="text-sm text-muted mb-5">This action cannot be undone.</p>
            <div className="flex gap-2">
              <ClayButton
                primary={false}
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </ClayButton>
              <ClayButton
                className="flex-1 !bg-red-500 hover:!bg-red-600"
                onClick={async () => {
                  const payload = deleteConfirm;
                  setDeleteConfirm(null);
                  if (!payload) return;
                  const success = await handleDeleteEvent(payload.eventId);
                  if (success) payload.onSuccess?.();
                }}
              >
                Delete
              </ClayButton>
            </div>
          </ClayCard>
        </div>
      )}

      {/* Printable Access Card Overlay */}
      {selectedEventId && (() => {
        const selectedEvent = events.find((e) => e.id === selectedEventId);
        if (!selectedEvent) return null;
        return <PrintableAccessCard event={selectedEvent} qrData={qrDataForPrint} />;
      })()}

      {/* On-screen Qr Banner Preview Modal */}
      {showQrBannerModal && selectedEventId && (() => {
        const selectedEvent = events.find((e) => e.id === selectedEventId);
        if (!selectedEvent) return null;
        return (
          <QrBannerModal 
            event={selectedEvent} 
            qrData={qrDataForPrint} 
            onClose={() => setShowQrBannerModal(false)} 
            showToast={showToast}
          />
        );
      })()}
    </div>
  );
}

function QrBannerModal({ 
  event, 
  qrData, 
  onClose,
  showToast
}: { 
  event: EventPayload; 
  qrData: string; 
  onClose: () => void;
  showToast: ShowToast;
}) {
  const eventUrl = typeof window !== "undefined"
    ? `${(window.location.hostname.includes("jantrasoft.online") || window.location.hostname.includes("sslip.io")) ? "https://chobidao.jantrasoft.online" : window.location.origin}/e/${event.slug}`
    : `https://chobidao.jantrasoft.online/e/${event.slug}`;
  const handleDownload = () => {
    try {
      showToast("Generating high-resolution banner...");
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 1100;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 1100);

      // Draw decorative accents
      ctx.fillStyle = "rgba(249, 115, 22, 0.05)";
      ctx.beginPath();
      ctx.arc(800, 0, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 1100, 150, 0, Math.PI * 2);
      ctx.fill();

      // Draw border
      ctx.lineWidth = 16;
      ctx.strokeStyle = "#f97316";
      ctx.lineJoin = "round";
      
      const r = 40;
      const x = 32;
      const y = 32;
      const w = 736;
      const h = 1036;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.stroke();

      // Draw Header Chobi Dao
      ctx.fillStyle = "#27272a";
      ctx.font = "900 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Chobi Dao", 400, 120);

      // Draw Line Accent
      ctx.fillStyle = "#f97316";
      ctx.fillRect(340, 150, 120, 6);

      // Draw Event Name
      ctx.fillStyle = "#27272a";
      ctx.font = "900 42px sans-serif";
      ctx.fillText(event.name.toUpperCase(), 400, 230);

      ctx.fillStyle = "#71717a";
      ctx.font = "700 18px sans-serif";
      ctx.fillText("OFFICIAL EVENT GALLERY", 400, 275);

      // Draw Steps
      const steps = [
        { label: "SCAN QR CODE", step: "01" },
        { label: "FIND YOURSELF", step: "02" },
        { label: "GET PHOTOS", step: "03" }
      ];

      steps.forEach((step, i) => {
        const sx = 140 + i * 260;
        ctx.fillStyle = "#ffedd5";
        ctx.beginPath();
        ctx.arc(sx, 840, 36, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ea580c";
        ctx.font = "900 24px sans-serif";
        ctx.fillText(step.step, sx, 848);

        ctx.fillStyle = "#27272a";
        ctx.font = "900 14px sans-serif";
        ctx.fillText(step.label, sx, 915);
      });

      // Draw Footer URL
      ctx.fillStyle = "rgba(39, 39, 42, 0.4)";
      ctx.font = "900 18px sans-serif";
      ctx.fillText(eventUrl.toUpperCase(), 400, 1000);

      // Load and draw QR + app logo
      const qrImg = new window.Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrData;
      qrImg.onload = () => {
        const logoImg = new window.Image();
        logoImg.src = "/logo.png";
        logoImg.onload = () => {
          ctx.drawImage(logoImg, 312, 70, 48, 48);
          drawQrAndDownload();
        };
        logoImg.onerror = () => {
          drawQrAndDownload();
        };
      };

      const drawQrAndDownload = () => {
        ctx.fillStyle = "#fff8f1";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffedd5";
        
        const qx = 200;
        const qy = 330;
        const qw = 400;
        const qh = 400;
        const qrBorder = 30;

        ctx.beginPath();
        ctx.moveTo(qx + qrBorder, qy);
        ctx.lineTo(qx + qw - qrBorder, qy);
        ctx.quadraticCurveTo(qx + qw, qy, qx + qw, qy + qrBorder);
        ctx.lineTo(qx + qw, qy + qh - qrBorder);
        ctx.quadraticCurveTo(qx + qw, qy + qh, qx + qw - qrBorder, qy + qh);
        ctx.lineTo(qx + qrBorder, qy + qh);
        ctx.quadraticCurveTo(qx, qy + qh, qx, qy + qh - qrBorder);
        ctx.lineTo(qx, qy + qrBorder);
        ctx.quadraticCurveTo(qx, qy, qx + qrBorder, qy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(qrImg, 230, 360, 340, 340);

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(400, 530, 35, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 4;
        ctx.strokeStyle = "#f97316";
        ctx.stroke();

        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(400, 532, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(388, 518, 24, 6);

        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `${event.slug}-event-banner.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Banner image downloaded successfully!");
      };
    } catch (err) {
      console.error(err);
      showToast("Failed to generate banner image");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/30 backdrop-blur-md animate-in fade-in duration-300">
      <ClayCard className="w-full max-w-xl p-0 animate-[float_0.4s_ease-out_forwards] border-orange-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-orange-100 bg-orange-50/30 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-clay-pressed">
              <Icons.QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black font-heading text-xl text-charcoal">Event Access Poster</h3>
              <p className="text-muted text-[10px] font-bold uppercase tracking-wider">Share or print for event guests</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-orange-500 transition-colors p-1">
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-charcoal/5 flex justify-center items-center">
          <div className="w-[300px] h-[412px] scale-100 origin-center border-4 border-orange-500 rounded-[30px] p-6 flex flex-col items-center justify-between bg-white shadow-lg relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full -ml-12 -mb-12" />
            
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-1 mb-2">
                <img src="/logo.png" alt="Chobi Dao" className="w-4 h-4 object-contain" />
                <h2 className="text-[10px] font-black text-charcoal tracking-tight uppercase">Chobi Dao</h2>
              </div>
              <h1 className="text-sm font-black text-charcoal mb-0.5 truncate uppercase px-2" title={event.name}>{event.name}</h1>
              <p className="text-[7px] font-bold text-muted tracking-widest uppercase">Official Gallery</p>
            </div>

            <div className="relative p-2 bg-orange-50/50 rounded-2xl border border-orange-100 shadow-inner flex items-center justify-center">
              <div className="p-1 bg-white rounded-xl shadow-md border border-orange-100">
                <img src={qrData} alt="QR Code" className="w-24 h-24 object-contain" />
              </div>
            </div>

            <div className="text-center w-full">
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { step: "01", text: "Scan", icon: Icons.QrCode },
                  { step: "02", text: "Match", icon: Icons.FaceId },
                  { step: "03", text: "Get", icon: Icons.Download },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-[8px]">
                      <item.icon size={10} />
                    </div>
                    <p className="text-[7px] font-black text-charcoal uppercase tracking-wider">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-orange-50 w-full">
                <p className="text-[7px] font-bold text-muted/60 tracking-wider truncate px-2" title={eventUrl}>{eventUrl}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-orange-100 bg-orange-50/20 flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-clay-pressed hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Icons.Download className="w-4 h-4" />
            Download Banner PNG
          </button>
          <button
            onClick={() => {
              onClose();
              window.print();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-orange-50 text-charcoal border border-orange-200 font-black text-xs shadow-clay-card hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Icons.Calendar className="w-4 h-4 text-orange-500" />
            Print Poster PDF
          </button>
        </div>
      </ClayCard>
    </div>
  );
}

function PrintableAccessCard({ event, qrData }: { event: EventPayload; qrData: string }) {
  if (!qrData) return null;
  const eventUrl = typeof window !== "undefined"
    ? `${(window.location.hostname.includes("jantrasoft.online") || window.location.hostname.includes("sslip.io")) ? "https://chobidao.jantrasoft.online" : window.location.origin}/e/${event.slug}`
    : `https://chobidao.jantrasoft.online/e/${event.slug}`;
  
  return (
    <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #access-card-print, #access-card-print * { visibility: visible; }
          #access-card-print { 
            position: absolute; 
            left: 50%; 
            top: 50%; 
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          @page { size: auto; margin: 0; }
        }
      `}</style>
      
      <div id="access-card-print" className="w-[800px] h-[1100px] flex items-center justify-center p-20">
        <div className="w-full h-full border-[16px] border-orange-500 rounded-[80px] p-16 flex flex-col items-center justify-between bg-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full -ml-32 -mb-32" />
          
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center shadow-xl p-3">
                <img src="/logo.png" alt="Chobi Dao logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-6xl font-black text-charcoal tracking-tighter">Chobi Dao</h2>
            </div>
            
            <div className="h-2 w-32 bg-orange-500 mx-auto rounded-full mb-12" />
            
            <h1 className="text-7xl font-black text-charcoal mb-4 uppercase leading-tight">{event.name}</h1>
            <p className="text-2xl font-bold text-muted uppercase tracking-[0.2em]">Official Event Gallery</p>
          </div>

          <div className="relative group p-10 bg-orange-50 rounded-[60px] border-4 border-orange-100 shadow-inner">
            <div className="p-8 bg-white rounded-[40px] shadow-2xl border-2 border-orange-200">
              <img src={qrData} alt="QR Code" className="w-[400px] h-[400px]" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-3xl shadow-2xl border-4 border-orange-500 flex items-center justify-center">
               <img src="/logo.png" alt="Chobi Dao logo" className="w-12 h-12 object-contain" />
            </div>
          </div>

          <div className="text-center space-y-8 w-full">
            <div className="grid grid-cols-3 gap-8 mb-12">
               {[
                 { step: "01", text: "Scan QR Code", icon: Icons.QrCode },
                 { step: "02", text: "Find Yourself", icon: Icons.FaceId },
                 { step: "03", text: "Get Photos", icon: Icons.Download },
               ].map((item, i) => (
                 <div key={i} className="flex flex-col items-center gap-4">
                   <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xl">
                     <item.icon size={32} />
                   </div>
                   <p className="text-xl font-black text-charcoal uppercase tracking-widest">{item.text}</p>
                 </div>
               ))}
            </div>
            
            <div className="pt-8 border-t-4 border-orange-50 w-full">
              <p className="text-xl font-black text-charcoal/40 tracking-[0.08em]">{eventUrl}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
