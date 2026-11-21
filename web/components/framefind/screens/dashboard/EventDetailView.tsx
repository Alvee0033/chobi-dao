import { useEffect, useState } from "react";
import { getEvent, getEventIndexStatus, getEventQr, type EventPayload, type EventIndexStatus } from "@/lib/api";
import { Icons } from "../../icons";
import type { ShowToast } from "../../types";
import { ClayButton } from "../../ui/ClayButton";
import { ClayCard } from "../../ui/ClayCard";

export function EventDetailView({ 
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
  coverUploadProgress = null,
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
  coverUploadProgress?: number | null;
  origin: string;
  onPrint: () => void;
  onOpenGallery: () => void;
}) {
  const event = events.find(e => e.id === eventId);
  const [copied, setCopied] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventPayload | null>(null);
  const [indexStatus, setIndexStatus] = useState<EventIndexStatus | null>(null);
  const [qrData, setQrData] = useState<string>("");
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setQrData("");
      setQrError(false);
      const [eventResult, statusResult, qrResult] = await Promise.allSettled([
          withRefresh((token) => getEvent(token, eventId)),
          withRefresh((token) => getEventIndexStatus(token, eventId)),
          withRefresh((token) => getEventQr(token, eventId))
      ]);
      if (!active) return;
      if (eventResult.status === "fulfilled") setDetailEvent(eventResult.value);
      if (statusResult.status === "fulfilled") setIndexStatus(statusResult.value);
      if (qrResult.status === "fulfilled") {
        const rawData = qrResult.value.pngBase64;
        const formattedQr = rawData.startsWith("data:") ? rawData : `data:image/png;base64,${rawData}`;
        setQrData(formattedQr);
      } else {
        setQrError(true);
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
                 <label className={`text-[9px] md:text-[10px] font-black text-orange-500 uppercase tracking-widest ${coverUploadProgress !== null ? "cursor-wait opacity-70" : "hover:underline cursor-pointer"}`}>
                    {coverUploadProgress !== null ? `Uploading ${coverUploadProgress}%` : "Change"}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      disabled={coverUploadProgress !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = "";
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
                 {coverUploadProgress !== null && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#281810]/45 text-white backdrop-blur-[2px]" role="status" aria-live="polite"><Icons.Loader size={22} className="animate-spin" /><span className="text-[10px] font-bold">Uploading cover · {coverUploadProgress}%</span><div className="h-1 w-2/3 overflow-hidden rounded-full bg-white/30"><span className="block h-full rounded-full bg-orange-300 transition-[width] duration-200" style={{ width: `${coverUploadProgress}%` }} /></div></div>}
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
                   </div>
                 ) : (
                   <div className="w-40 h-40 md:w-48 md:h-48 bg-white/50 rounded-2xl md:rounded-3xl flex items-center justify-center text-orange-200 border border-orange-100/50">
                     <Icons.QrCode size={64} className="opacity-20 md:w-20 md:h-20" />
                   </div>
                 )}
              </div>
              {qrError && <p className="mb-3 text-center text-xs font-semibold text-red-700">QR could not load. Refresh this page to try again.</p>}
              
              <div className="space-y-2 md:space-y-3">
                 <ClayButton onClick={downloadQr} disabled={!qrData} className="w-full !rounded-xl md:!rounded-2xl !py-3 md:!py-4 font-black shadow-clay-pressed text-xs md:text-sm">
                   Download QR Kit
                 </ClayButton>
                 <button 
                   onClick={onPrint} 
                   disabled={!qrData}
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

