"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createUploadUrls, finalizeUpload, refreshToken as renewToken } from "@/lib/api";
import { useAuth } from "@/components/framefind/AuthProvider";
import type { UploadItem, UploadSummary } from "./model";

const LIMIT = 100 * 1024 * 1024;
const MAX_PARALLEL = 2;
const CHUNK = 40;
const VISIBLE_LIMIT = 32;
type UploadReservation = { photoId: string; uploadUrl: string; key: string; expiresAt: string; requiredHeaders?: Record<string, string> };
type SafeUpload = Omit<UploadItem, "file" | "previewObjectUrl" | "abort">;
type Manager = { queue: SafeUpload[]; queueLength: number; getQueueWindow: (offset: number, limit: number) => SafeUpload[]; summaries: Record<string, UploadSummary>; uploadingEventId: string | null; enqueue: (eventId: string, files: File[]) => void; cancel: (id: string) => void; retry: (id: string) => void };
const Context = createContext<Manager | null>(null);

export function useUploadManager() {
  const value = useContext(Context);
  if (!value) throw new Error("UploadManagerProvider is missing");
  return value;
}

export function UploadManagerProvider({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  const files = useRef(new Map<string, File>());
  const records = useRef(new Map<string, UploadItem>());
  const controllers = useRef(new Map<string, AbortController>());
  const reservations = useRef(new Map<string, Promise<UploadReservation>>());
  const running = useRef(0);
  const starting = useRef(false);
  const [queue, setQueue] = useState<SafeUpload[]>([]);
  const [queueLength, setQueueLength] = useState(0);
  const [summaries, setSummaries] = useState<Record<string, UploadSummary>>({});
  const [uploadingEventId, setUploadingEventId] = useState<string | null>(null);
  const authRef = useRef(auth);
  authRef.current = auth;

  const publish = useCallback(() => {
    const items = [...records.current.values()].filter((item) => item.status !== "ready" && item.status !== "canceled");
    const prioritized = [
      ...items.filter((item) => item.status === "uploading" || item.status === "processing"),
      ...items.filter((item) => item.status === "failed"),
      ...items.filter((item) => item.status === "queued"),
    ];
    setQueueLength(prioritized.length);
    setQueue(prioritized.slice(0, VISIBLE_LIMIT).map(({ file: _file, previewObjectUrl: _preview, abort: _abort, ...safe }) => safe));
  }, []);

  const getQueueWindow = useCallback((offset: number, limit: number) => {
    const groups: UploadItem[][] = [[], [], []];
    for (const item of records.current.values()) {
      if (item.status === "ready" || item.status === "canceled") continue;
      groups[item.status === "uploading" || item.status === "processing" ? 0 : item.status === "failed" ? 1 : 2].push(item);
    }
    const items = groups.flat();
    return items.slice(offset, offset + limit).map(({ file: _file, previewObjectUrl: _preview, abort: _abort, ...safe }) => safe);
  }, []);

  const withToken = useCallback(async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
    let current = authRef.current;
    if (!current) throw new Error("Sign in to continue uploading");
    try { return await fn(current.accessToken); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.includes("401")) throw error;
      const next = await renewToken(current.refreshToken);
      current = { ...current, accessToken: next.accessToken, refreshToken: next.refreshToken };
      authRef.current = current;
      window.localStorage.setItem("framefind.auth", JSON.stringify(current));
      window.dispatchEvent(new Event("framefind-auth-updated"));
      return fn(current.accessToken);
    }
  }, []);

  const work = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    try {
      while (running.current < MAX_PARALLEL) {
        const next = [...records.current.values()].find((item) => item.status === "queued");
        if (!next) break;
        const file = files.current.get(next.id);
        if (!file) { records.current.delete(next.id); continue; }
        const controller = new AbortController();
        controllers.current.set(next.id, controller);
        records.current.set(next.id, { ...next, status: next.progress >= 100 && next.photoId ? "processing" : "uploading" });
        running.current += 1;
        setUploadingEventId(next.eventId);
        publish();
        void (async () => {
          let complete = false;
          try {
            const presignPromise = reservations.current.get(next.id);
            if (!presignPromise) throw new Error("Upload reservation expired. Retry this photo.");
            const presign = await presignPromise;
            records.current.set(next.id, { ...records.current.get(next.id)!, photoId: presign.photoId });
            if (!(next.progress >= 100 && next.photoId)) await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open("PUT", presign.uploadUrl);
              Object.entries(presign.requiredHeaders || {}).forEach(([key, value]) => xhr.setRequestHeader(key, value));
              let last = 0;
              xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) return;
                const progress = Math.min(99, Math.round(event.loaded / event.total * 100));
                if (progress - last < 8) return;
                last = progress;
                const item = records.current.get(next.id);
                if (item) records.current.set(next.id, { ...item, progress });
                publish();
              };
              xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
              xhr.onerror = () => reject(new Error("Network error during upload"));
              controller.signal.addEventListener("abort", () => { xhr.abort(); reject(new Error("Upload canceled")); }, { once: true });
              xhr.send(file);
            });
            records.current.set(next.id, { ...records.current.get(next.id)!, status: "processing", progress: 100 });
            publish();
            await withToken((token) => finalizeUpload(token, next.eventId, [presign.photoId]));
            reservations.current.delete(next.id);
            complete = true;
            window.dispatchEvent(new Event("chobi-upload-complete"));
            const done = records.current.get(next.id);
            if (done) records.current.set(next.id, { ...done, status: "ready" });
            setSummaries((prior) => ({ ...prior, [next.eventId]: { ...prior[next.eventId], uploaded: (prior[next.eventId]?.uploaded ?? 0) + 1 } }));
          } catch (error) {
            const current = records.current.get(next.id);
            if (current) records.current.set(next.id, { ...current, status: controller.signal.aborted ? "canceled" : "failed", error: error instanceof Error ? error.message : "Upload failed" });
            if (!controller.signal.aborted) setSummaries((prior) => ({ ...prior, [next.eventId]: { ...prior[next.eventId], failed: (prior[next.eventId]?.failed ?? 0) + 1 } }));
          } finally {
            controllers.current.delete(next.id);
            running.current -= 1;
            if (complete) files.current.delete(next.id);
            if (running.current === 0) setUploadingEventId(null);
            publish();
            void work();
          }
        })();
      }
    } finally { starting.current = false; }
  }, [publish, withToken]);

  const enqueue = useCallback((eventId: string, selected: File[]) => {
    const supported = selected.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= LIMIT);
    const rejected = selected.length - supported.length;
    if (!supported.length) {
      window.dispatchEvent(new CustomEvent("chobi-toast", { detail: "Choose JPG, PNG, or WebP photos up to 100 MB each." }));
      return;
    }
    setSummaries((prior) => ({ ...prior, [eventId]: { total: (prior[eventId]?.total ?? 0) + supported.length, preparing: (prior[eventId]?.preparing ?? 0) + supported.length, uploaded: prior[eventId]?.uploaded ?? 0, failed: prior[eventId]?.failed ?? 0 } }));
    window.dispatchEvent(new CustomEvent("chobi-toast", { detail: `${supported.length} photos added${rejected ? ` · ${rejected} skipped` : ""}` }));
    let index = 0;
    const append = () => {
      const end = Math.min(index + CHUNK, supported.length);
      const batch: Array<{ id: string; file: File }> = [];
      for (; index < end; index += 1) {
        const file = supported[index];
        const id = crypto.randomUUID();
        files.current.set(id, file);
        records.current.set(id, { id, eventId, fileName: file.name, progress: 0, status: "queued" });
        batch.push({ id, file });
      }
      const reservationBatch = withToken((token) => createUploadUrls(token, eventId, batch.map(({ file }) => ({ fileName: file.name, contentType: file.type || "image/jpeg", fileSizeBytes: file.size }))));
      batch.forEach(({ id }, position) => reservations.current.set(id, reservationBatch.then((result) => {
        const reservation = result[position];
        if (!reservation) throw new Error("Storage or free-plan upload limit reached. Upgrade your plan or free up storage.");
        return reservation;
      })));
      void reservationBatch.then(() => {
        setSummaries((prior) => ({ ...prior, [eventId]: { ...prior[eventId], preparing: Math.max(0, (prior[eventId]?.preparing ?? 0) - batch.length) } }));
        publish();
        void work();
      }).catch((error) => {
        for (const { id } of batch) {
          const item = records.current.get(id);
          if (item) records.current.set(id, { ...item, status: "failed", error: error instanceof Error ? error.message : "Could not reserve upload." });
          reservations.current.delete(id);
        }
        setSummaries((prior) => ({ ...prior, [eventId]: { ...prior[eventId], preparing: Math.max(0, (prior[eventId]?.preparing ?? 0) - batch.length), failed: (prior[eventId]?.failed ?? 0) + batch.length } }));
        publish();
      });
      publish();
      if (index < supported.length) window.setTimeout(append, 0);
    };
    window.setTimeout(append, 0);
  }, [publish, work, withToken]);

  const cancel = useCallback((id: string) => {
    const item = records.current.get(id);
    controllers.current.get(id)?.abort();
    records.current.delete(id);
    files.current.delete(id);
    reservations.current.delete(id);
    publish();
    if (item) setSummaries((prior) => ({ ...prior, [item.eventId]: { ...prior[item.eventId], total: Math.max(0, (prior[item.eventId]?.total ?? 0) - 1), failed: item.status === "failed" ? Math.max(0, (prior[item.eventId]?.failed ?? 0) - 1) : prior[item.eventId]?.failed ?? 0 } }));
  }, [publish]);
  const retry = useCallback((id: string) => {
    const item = records.current.get(id);
    if (!item || item.status !== "failed") return;
    if (!item.photoId) {
      const file = files.current.get(id);
      if (!file) return;
      reservations.current.set(id, withToken((token) => createUploadUrls(token, item.eventId, [{ fileName: file.name, contentType: file.type || "image/jpeg", fileSizeBytes: file.size }])).then((result) => {
        if (!result[0]) throw new Error("Could not reserve this photo.");
        return result[0];
      }));
      void reservations.current.get(id)?.catch((error) => {
        const current = records.current.get(id);
        if (current) records.current.set(id, { ...current, error: error instanceof Error ? error.message : "Could not reserve this photo." });
        publish();
      });
    }
    records.current.set(id, { ...item, status: "queued", progress: 0, error: undefined });
    setSummaries((prior) => ({ ...prior, [item.eventId]: { ...prior[item.eventId], failed: Math.max(0, (prior[item.eventId]?.failed ?? 0) - 1) } }));
    publish();
    void work();
  }, [publish, work, withToken]);

  useEffect(() => () => { controllers.current.forEach((controller) => controller.abort()); }, []);
  const value = useMemo(() => ({ queue, queueLength, getQueueWindow, summaries, uploadingEventId, enqueue, cancel, retry }), [queue, queueLength, getQueueWindow, summaries, uploadingEventId, enqueue, cancel, retry]);
  return <Context.Provider value={value}>{children}<UploadPanel /></Context.Provider>;
}

function UploadPanel() {
  const { queue, queueLength, getQueueWindow, summaries, cancel, retry } = useUploadManager();
  const [expanded, setExpanded] = useState(false);
  const [windowStart, setWindowStart] = useState(0);
  const active = queueLength;
  const windowSize = 6;
  const visible = getQueueWindow(windowStart, windowSize);
  if (!active) return null;
  const total = Object.values(summaries).reduce((sum, row) => sum + row.total, 0);
  const completed = Object.values(summaries).reduce((sum, row) => sum + row.uploaded, 0);
  return <aside className="fixed bottom-4 right-4 z-[100] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-[0_16px_48px_rgba(70,36,18,.2)]" aria-label="Photo uploads">
    <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
      <span><strong className="block text-sm text-stone-900">Uploading photos</strong><span className="text-xs text-stone-500">{completed} of {total} complete · {active} shown</span></span><span className="text-orange-600">{expanded ? "−" : "+"}</span>
    </button>
    <div className="h-1 bg-orange-100"><div className="h-full bg-orange-500 transition-[width]" style={{ width: `${total ? Math.min(100, completed / total * 100) : 0}%` }} /></div>
    {expanded && <div className="border-t border-orange-100 p-2"><div className="mb-1 flex items-center justify-between px-2 text-[10px] text-stone-500"><button disabled={windowStart === 0} onClick={() => setWindowStart((value) => Math.max(0, value - windowSize))} className="disabled:opacity-40">Previous</button><span>{Math.min(windowStart + 1, active)}–{Math.min(windowStart + visible.length, active)} of {active}</span><button disabled={windowStart + windowSize >= active} onClick={() => setWindowStart((value) => Math.min(Math.max(0, active - windowSize), value + windowSize))} className="disabled:opacity-40">Next</button></div><div className="max-h-64 overflow-y-auto" role="list">{visible.map((item) => <div key={item.id} className="flex h-10 items-center gap-2 rounded-lg px-2 text-xs" role="listitem"><span className="min-w-0 flex-1 truncate">{item.fileName}</span><span className="text-stone-500">{item.status === "failed" ? "Failed" : item.status === "processing" ? "Indexing" : `${item.progress}%`}</span>{item.status === "failed" ? <button onClick={() => retry(item.id)} className="font-semibold text-orange-700">Retry</button> : <button onClick={() => cancel(item.id)} className="text-stone-500">Cancel</button>}</div>)}</div></div>}
  </aside>;
}
