import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createEvent, createEventCoverUploadUrl, createUploadUrl, disconnectGoogleDrive, finalizeUpload, getApiBaseUrl, getEventQr, getEvents, getGoogleConnectUrl, refreshToken, updateEvent, deleteEvent, getPhotographerAnalytics, getBillingUsage, type BillingUsage, type EventPayload, type PhotographerAnalytics } from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "../icons";
import type { DashboardAuthState, ShowToast, ViewSetter } from "../types";
import { ClayButton } from "../ui/ClayButton";
import { ClayCard } from "../ui/ClayCard";
import "./dashboard-page.css";
import type { UploadSummary } from "./dashboard/model";
import { useUploadManager } from "./dashboard/UploadManager";
import { PhotographerNotifications } from "./dashboard/PhotographerNotifications";

async function optimizeImageForDirectUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 2_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) { bitmap.close(); return file; }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], `${file.name.replace(/\.[^/.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: Date.now() }) : file;
  } catch { return file; }
}

function DashboardViewLoading() {
  return <div className="flex items-center justify-center gap-3 py-20 text-sm font-bold text-orange-700" role="status"><Icons.Loader size={20} className="animate-spin" /> Loading workspace…</div>;
}

const EventDetailView = dynamic(() => import("./dashboard/EventDetailView").then((module) => module.EventDetailView), { loading: DashboardViewLoading });
const PhotoGalleryView = dynamic(() => import("./dashboard/PhotoGalleryView").then((module) => module.PhotoGalleryView), { loading: DashboardViewLoading });
const AnalyticsSection = dynamic(() => import("./dashboard/AnalyticsSection").then((module) => module.AnalyticsSection), { loading: DashboardViewLoading });
const SettingsSection = dynamic(() => import("./dashboard/SettingsSection").then((module) => module.SettingsSection), { loading: DashboardViewLoading });
const BillingSection = dynamic(() => import("./dashboard/BillingSection").then((module) => module.BillingSection), { loading: DashboardViewLoading });
const QrBannerModal = dynamic(() => import("./dashboard/DashboardPrint").then((module) => module.QrBannerModal));
const PrintableAccessCard = dynamic(() => import("./dashboard/DashboardPrint").then((module) => module.PrintableAccessCard));

type TabId = "events" | "analytics" | "settings" | "billing";


function parseDashboardPath(pathname: string): { tab: TabId; eventId: string | null; gallery: boolean; showNew: boolean } {
  if (pathname.startsWith("/dashboard/analytics")) return { tab: "analytics", eventId: null, gallery: false, showNew: false };
  if (pathname.startsWith("/dashboard/settings")) return { tab: "settings", eventId: null, gallery: false, showNew: false };
  if (pathname.startsWith("/dashboard/billing")) return { tab: "billing", eventId: null, gallery: false, showNew: false };
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
      className={`studio-nav-item flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm transition-all duration-300 ${
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
  imagePriority,
}: {
  event: EventPayload;
  onView: () => void;
  onDelete: () => void;
  imagePriority: boolean;
}) {
  const [imageState, setImageState] = useState({ src: event.thumbnailUrl ?? "", loaded: false, failed: false });
  const imageReady = imageState.src === (event.thumbnailUrl ?? "") && imageState.loaded;
  const imageFailed = imageState.src === (event.thumbnailUrl ?? "") && imageState.failed;
  return (
    <article className="studio-event-card" data-testid="event-card">
      <button className="studio-event-card-main" type="button" onClick={onView} aria-label={`Manage ${event.name}`}>
        <div className="studio-event-card-cover">
          {event.thumbnailUrl && !imageFailed ? <>
            {!imageReady && <div className="studio-event-card-image-loading" aria-hidden="true"><Icons.Camera size={26} /></div>}
            <img key={event.thumbnailUrl} src={event.thumbnailUrl} alt="" loading={imagePriority ? "eager" : "lazy"} fetchPriority={imagePriority ? "high" : "auto"} decoding="async" onLoad={() => setImageState({ src: event.thumbnailUrl ?? "", loaded: true, failed: false })} onError={() => setImageState({ src: event.thumbnailUrl ?? "", loaded: false, failed: true })} className={imageReady ? "is-loaded" : "is-loading"} />
          </> : <div className="studio-event-card-placeholder"><Icons.Camera size={30} /></div>}
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
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  const [showQrBannerModal, setShowQrBannerModal] = useState<boolean>(false);
  const [events, setEvents] = useState<EventPayload[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDetails, setEventDetails] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(routeState.eventId);
  const [coverUploadProgress, setCoverUploadProgress] = useState<Record<string, number>>({});
  const { queue: uploadQueue, summaries: uploadSummaries, uploadingEventId, enqueue: enqueuePhotoUploads, cancel: cancelUpload, retry: retryUpload } = useUploadManager();
  const [newEventPublicLink, setNewEventPublicLink] = useState("");
  const [newEventQr, setNewEventQr] = useState("");
  const [eventBanner, setEventBanner] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ eventId: string; onSuccess?: () => void } | null>(null);
  const [qrDataForPrint, setQrDataForPrint] = useState<string>("");
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
    const refreshEvents = () => { if (auth) void withRefresh((token) => getEvents(token)).then(setEvents).catch(() => {}); };
    window.addEventListener("chobi-upload-complete", refreshEvents);
    return () => window.removeEventListener("chobi-upload-complete", refreshEvents);
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

  useEffect(() => {
    if (auth) withRefresh((token) => getBillingUsage(token)).then(setBillingUsage).catch(() => setBillingUsage(null));
  }, [auth]);

  const handleTabChange = (tab: TabId) => {
    if (tab === "analytics") router.push("/dashboard/analytics");
    else if (tab === "settings") router.push("/dashboard/settings");
    else if (tab === "billing") router.push("/dashboard/billing");
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
    const previewUrl = URL.createObjectURL(file);
    const previous = events.find((event) => event.id === eventId)?.thumbnailUrl;
    setEvents((current) => current.map((event) => event.id === eventId ? { ...event, thumbnailUrl: previewUrl } : event));
    setCoverUploadProgress((current) => ({ ...current, [eventId]: 0 }));
    try {
    const optimizedFile = await optimizeImageForDirectUpload(file);
    setCoverUploadProgress((current) => ({ ...current, [eventId]: 12 }));
    const presign = await withRefresh((token) => createEventCoverUploadUrl(token, eventId, optimizedFile.name, optimizedFile.type || "image/jpeg"));
    const uploadUrl = presign.uploadUrl.startsWith("http")
      ? presign.uploadUrl
      : `${getApiBaseUrl()}${presign.uploadUrl}`;
    setCoverUploadProgress((current) => ({ ...current, [eventId]: 20 }));
    const uploadRes = await withRefresh((token) => new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      for (const [key, value] of Object.entries(presign.requiredHeaders || {})) xhr.setRequestHeader(key, value);
      xhr.setRequestHeader("Content-Type", optimizedFile.type || "application/octet-stream");
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.max(20, Math.min(90, Math.round(20 + event.loaded / event.total * 70)));
        setCoverUploadProgress((current) => ({ ...current, [eventId]: progress }));
      };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(new Response(xhr.responseText, { status: xhr.status })) : reject(new Error(`Cover upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error("Network error during cover upload"));
      xhr.send(optimizedFile);
    }));
    const uploaded = await uploadRes.json().catch(() => ({} as { coverPhotoKey?: string }));
    const coverKey = uploaded.coverPhotoKey ?? presign.key;
    setCoverUploadProgress((current) => ({ ...current, [eventId]: 95 }));
    const updatedEvent = await withRefresh((token) => updateEvent(token, eventId, { thumbnailUrl: coverKey }));
    setEvents((prev) => prev.map((event) => event.id === eventId ? { ...event, ...updatedEvent, thumbnailUrl: updatedEvent.thumbnailUrl || previewUrl } : event));
    URL.revokeObjectURL(previewUrl);
    showToast("Cover updated");
    } catch (error) {
      setEvents((current) => current.map((event) => event.id === eventId ? { ...event, thumbnailUrl: previous } : event));
      URL.revokeObjectURL(previewUrl);
      throw error;
    } finally {
      setCoverUploadProgress((current) => { const next = { ...current }; delete next[eventId]; return next; });
    }
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

  const activeEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) : null;
  const subpageTitle = isViewingGallery ? "Photo Gallery" : (activeEvent?.name || "Event Details");
  const filteredEvents = events
    .filter((event) => event.name.toLowerCase().includes(searchQuery.toLowerCase()) || event.location?.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((event) => filterStatus === "all" || event.status === filterStatus);

  return (
    <div className="studio-dashboard min-h-screen flex bg-[#faf9f6] w-full relative z-10 font-sans" data-testid="dashboard-page">
      {/* Mobile Header (Dynamic & Context-aware) */}
      <header className="studio-mobile-header lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-orange-100 z-[60] px-4 flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              {auth && <PhotographerNotifications token={auth.accessToken} />}
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
              <img src="/assets/chobidao.webp" alt="Chobi Dao" className="w-7 h-7 object-contain" />
              <span>Chobi dao</span>
            </div>
            <div className="flex items-center gap-2">{auth && <PhotographerNotifications token={auth.accessToken} />}<button 
              onClick={() => handleTabChange("settings")}
              className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-clay-card font-black active:scale-95 transition-all text-xs"
            >
              {auth?.name?.[0]?.toUpperCase() ?? "U"}
            </button></div>
          </>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Dashboard navigation" className={`studio-mobile-nav lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-t border-orange-100 flex items-center justify-around px-6 z-[60] transition-transform duration-300 ${
          selectedEventId ? 'translate-y-full' : 'translate-y-0 shadow-[0_-4px_16px_rgba(249,115,22,0.06)]'
        }`}
      >
        {[
          { id: "events" as TabId, label: "Events", Icon: Icons.Camera },
          { id: "analytics" as TabId, label: "Analytics", Icon: Icons.BarChart },
          { id: "settings" as TabId, label: "Settings", Icon: Icons.Settings },
          { id: "billing" as TabId, label: "Billing", Icon: Icons.Lock }
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
      </nav>

      {/* Sidebar - Desktop Only */}
      <aside aria-label="Studio workspace" className="studio-sidebar hidden lg:flex sticky top-0 left-0 z-[70] h-screen bg-white/95 backdrop-blur-2xl border-r border-orange-100/50 p-6 flex-col gap-8 w-72 shrink-0">
        <div className="flex items-center gap-3 text-orange-500 font-heading font-black text-2xl px-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-clay-card border border-orange-100">
            <img src="/assets/chobidao.webp" alt="Chobi Dao" className="w-8 h-8 object-contain" />
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

        <nav aria-label="Dashboard navigation" className="studio-sidebar-nav flex flex-col gap-2 flex-1 px-1">
          <span className="studio-nav-caption">Workspace</span>
          <NavItem id="events" Icon={Icons.Camera} label="Events" activeTab={activeTab} setActiveTab={handleTabChange} />
          <NavItem id="analytics" Icon={Icons.BarChart} label="Analytics" activeTab={activeTab} setActiveTab={handleTabChange} />
          <NavItem id="billing" Icon={Icons.Lock} label="Plan & billing" activeTab={activeTab} setActiveTab={handleTabChange} />
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
        {auth && <div className="hidden lg:flex justify-end mb-3"><PhotographerNotifications token={auth.accessToken} /></div>}
        {!selectedEventId && activeTab !== "billing" && billingUsage && (
          <div className="cd-dashboard-trial-banner">
            <span className="cd-dashboard-trial-mark"><Icons.Sparkles size={18} /></span>
            <div><strong>{billingUsage.trialDaysRemaining ? `Your Pro trial · ${billingUsage.trialDaysRemaining} days left` : billingUsage.plan === "pro" ? "You’re on Chobi Dao Pro" : "You’re on the Free plan"}</strong><span>{billingUsage.trialDaysRemaining ? "Enjoy 20 GB storage and unlimited matching while it lasts." : billingUsage.plan === "pro" ? `Your current plan ends ${billingUsage.currentPeriodEnd ? new Date(billingUsage.currentPeriodEnd).toLocaleDateString() : "soon"}.` : "Upgrade for 20 GB storage and unlimited face matching."}</span></div>
            <button onClick={() => handleTabChange("billing")}>{billingUsage.plan === "pro" && !billingUsage.trialDaysRemaining ? "View billing" : "Upgrade · ৳399"}<Icons.ArrowRight size={16} /></button>
          </div>
        )}
        {!selectedEventId && activeTab === "billing" ? <BillingSection auth={auth} showToast={showToast} /> : null}
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
              uploadSummary={uploadSummaries[selectedEventId]}
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
              coverUploadProgress={coverUploadProgress[selectedEventId] ?? null}
              origin={origin}
              onPrint={() => setShowQrBannerModal(true)}
              onOpenGallery={() => router.push(`/dashboard/events/${encodeURIComponent(selectedEventId)}/photos`)}
            />
          )
        ) : activeTab === "billing" ? null : (
          <div className="max-w-5xl mx-auto studio-events-workspace">
            {activeTab === "events" ? (
              <div className="studio-events-content">
                <div className="studio-events-heading-row">
                  <div className="studio-page-title"><div><p>YOUR STUDIO · WORKSPACE</p><h1>Events <span>{events.length}</span></h1><small>Your celebrations, beautifully organized.</small></div></div>
                  <div className="studio-events-kpis">
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
                  <button type="button" className="studio-create-event" onClick={handleOpenNewEvent}><Icons.Plus size={17} /> Create event</button>
                </div>

                <div className="studio-events-list">

                  {/* Search & Filters - Compact & Aligned */}
                  <div className="studio-search-bar flex flex-row gap-2 items-center p-1.5 bg-white rounded-2xl shadow-sm border border-orange-100/50" role="search">
                     <div className="relative flex-1">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 w-3.5 h-3.5" />
                        <input 
                           type="text" 
                           placeholder="Search events by name or location"
                           aria-label="Search events by name or location"
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
                           <option value="processing">PROCESSING</option>
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
                ) : filteredEvents.length === 0 ? (
                  <div className="studio-events-no-results"><Icons.Search size={22} /><strong>No events match those filters</strong><span>Try a different search or status.</span><button type="button" onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}>Clear filters</button></div>
                ) : (
                  <div className="studio-events-grid" data-testid="events-list">
                    {filteredEvents.map((event, index) => (
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        imagePriority={index < 3}
                        onView={() => router.push(`/dashboard/events/${encodeURIComponent(event.id)}`)} 
                        onDelete={() => requestDeleteEvent(event.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "analytics" ? (
            <AnalyticsSection analyticsData={analyticsData} isLoadingAnalytics={isLoadingAnalytics} />
          ) : (
            <SettingsSection auth={auth!} onAuth={onAuth} />
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
