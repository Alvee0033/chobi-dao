export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  photographer: {
    id: string;
    email: string;
    name?: string | null;
    plan: string;
    hasDriveConnected?: boolean;
    driveRootFolderId?: string | null;
  };
};
export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  hasDriveConnected?: boolean;
  driveRootFolderId?: string | null;
};
type MeResponse =
  | { actorType: "photographer"; photographer: AuthUser }
  | { actorType: "user"; user: { id: string; email: string; name?: string | null } };

export type EventPayload = {
  id: string;
  slug: string;
  name: string;
  details?: string | null;
  status: string;
  eventDate?: string | null;
  location?: string | null;
  thumbnailUrl?: string | null;
  coverPhotoKey?: string | null;
  totalPhotos?: number;
};

export type PublicEventPayload = {
  slug: string;
  name: string;
  eventDate?: string | null;
  location?: string | null;
  consentText?: string;
  searchEnabled: boolean;
};

export type EventCreatePayload = EventPayload & {
  publicUrl: string;
  qr: { url: string; pngBase64: string };
};
export type EventIndexStatus = {
  total: number;
  indexed: number;
  failed: number;
  inProgress: number;
};

export type SearchPhoto = {
  id: string;
  thumbUrl: string;
  thumbSmallUrl?: string;
  thumbMediumUrl?: string;
  fullUrl: string;
  urlExpiresAt: string;
  similarity: number;
};

export type EventPhoto = {
  id: string;
  url: string;
  fullUrl?: string;
  thumbUrl?: string;
  thumbSmallUrl?: string;
  thumbMediumUrl?: string;
  fileName: string;
  createdAt: string;
  size?: number;
  sizeBytes?: number;
  uploadedAt?: string;
  status: "pending_upload" | "uploaded" | "processing" | "ready" | "failed_upload" | "failed_processing";
  width?: number;
  height?: number;
  mimeType?: string;
  errorCode?: string;
};

export type EventPerson = {
  personId: string;
  label: string;
  faceCount: number;
  photoCount: number;
  coverPhotoId: string;
  coverThumbUrl: string;
  updatedAt: string;
};
 
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname.includes("jantrasoft.online")) {
      return "https://api-chobi.203.96.190.78.sslip.io";
    }
    if (hostname.includes("sslip.io") && !hostname.startsWith("api-")) {
      return `${protocol}//api-${hostname}`;
    }
  }
  return "http://localhost:3001";
}

const requestCache = new Map<string, { data: any; expiresAt: number }>();

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method.toUpperCase() === "GET";
  const authHeader = init?.headers && "Authorization" in init.headers 
    ? (init.headers as any).Authorization 
    : "";
  const cacheKey = `${path}:${authHeader}`;

  if (isGet) {
    const cached = requestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
  } else {
    // Clear cache on mutations to prevent stale data
    requestCache.clear();
  }

  const hasBody = init?.body !== undefined && init?.body !== null;
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {})
    }
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (payload as { message?: string }).message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  if (isGet) {
    // Cache GET results for 5 seconds to absorb rapid navigation clicks
    requestCache.set(cacheKey, {
      data: payload,
      expiresAt: Date.now() + 5000
    });
  }

  return payload as T;
}

function normalizeEvent<T extends EventPayload>(event: T): T {
  if (event.thumbnailUrl?.startsWith("/")) {
    return { ...event, thumbnailUrl: `${getApiBaseUrl()}${event.thumbnailUrl}` };
  }
  // If thumbnailUrl is missing but we have a coverPhotoKey that looks like a URL, use it
  if (!event.thumbnailUrl && event.coverPhotoKey?.startsWith("http")) {
    return { ...event, thumbnailUrl: event.coverPhotoKey };
  }
  return event;
}

export async function signup(email: string, password: string, name: string): Promise<AuthPayload> {
  return json<AuthPayload>("/v1/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) });
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  return json<AuthPayload>("/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function refreshToken(refreshTokenValue: string): Promise<AuthPayload> {
  return json<AuthPayload>("/v1/auth/refresh", { method: "POST", headers: { Authorization: `Bearer ${refreshTokenValue}` } });
}

export async function disconnectGoogleDrive(token: string): Promise<{ ok: true }> {
  return json<{ ok: true }>("/v1/auth/google/disconnect", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function me(token: string): Promise<AuthUser> {
  const response = await json<MeResponse | AuthUser>("/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  if ("actorType" in response) {
    if (response.actorType !== "photographer") {
      throw new Error("Photographer account required");
    }
    return response.photographer;
  }
  return response;
}

export function getGoogleConnectUrl(token?: string): string {
  const query = token ? `?state=${encodeURIComponent(token)}` : "";
  return `${getApiBaseUrl()}/v1/auth/google${query}`;
}

export function parseGoogleCallbackPayload(encodedPayload: string): AuthPayload {
  const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const decoded = JSON.parse(atob(padded)) as AuthPayload;
  if (!decoded?.accessToken || !decoded?.refreshToken || !decoded?.photographer?.id) {
    throw new Error("Invalid Google callback payload");
  }
  return decoded;
}

export async function getEvents(token: string): Promise<EventPayload[]> {
  const events = await json<EventPayload[]>("/v1/events", { headers: { Authorization: `Bearer ${token}` } });
  return events.map(normalizeEvent);
}

export async function createEvent(token: string, data: { name: string; details?: string; location?: string; eventDate?: string }): Promise<EventCreatePayload> {
  const created = await json<EventCreatePayload>("/v1/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  return normalizeEvent(created);
}

export async function createUploadUrl(token: string, eventId: string, fileName: string, contentType: string, fileSizeBytes: number, fileHash?: string): Promise<{ photoId: string; uploadUrl: string; key: string; expiresAt: string; requiredHeaders?: Record<string, string> }> {
  return json<{ photoId: string; uploadUrl: string; key: string; expiresAt: string; requiredHeaders?: Record<string, string> }>(`/v1/events/${encodeURIComponent(eventId)}/upload-url`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileName, contentType, fileSizeBytes, fileHash })
  });
}

export async function createEventCoverUploadUrl(token: string, eventId: string, fileName: string, contentType: string): Promise<{ uploadUrl: string; key: string; expiresAt: string; requiredHeaders?: Record<string, string> }> {
  return json<{ uploadUrl: string; key: string; expiresAt: string; requiredHeaders?: Record<string, string> }>(`/v1/events/${encodeURIComponent(eventId)}/cover-upload-url`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileName, contentType })
  });
}

export async function finalizeUpload(token: string, eventId: string, photoIds: string[]): Promise<{ enqueued: number; skippedDuplicates: number; photoIds: string[] }> {
  return json<{ enqueued: number; skippedDuplicates: number; photoIds: string[] }>(`/v1/events/${encodeURIComponent(eventId)}/finalize-upload`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ photoIds })
  });
}

export async function initMultipartUpload(token: string, eventId: string, fileName: string, contentType: string, fileSizeBytes: number, fileHash?: string): Promise<{ photoId: string; objectKey: string; uploadId: string; partSize: number; partCount: number }> {
  return json<{ photoId: string; objectKey: string; uploadId: string; partSize: number; partCount: number }>(`/v1/events/${encodeURIComponent(eventId)}/photos/upload/init`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileName, contentType, fileSizeBytes, fileHash })
  });
}

export async function presignMultipartParts(token: string, eventId: string, photoId: string, uploadId: string, partNumbers: number[]): Promise<{ presignedUrls: Array<{ partNumber: number; url: string }> }> {
  return json<{ presignedUrls: Array<{ partNumber: number; url: string }> }>(`/v1/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}/upload/parts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uploadId, partNumbers })
  });
}

export async function completeMultipartUpload(token: string, eventId: string, photoId: string, uploadId: string, etags: Array<{ partNumber: number; etag: string }>): Promise<{ ok: true }> {
  return json<{ ok: true }>(`/v1/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}/upload/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uploadId, etags })
  });
}

export async function getPublicEvent(slug: string): Promise<PublicEventPayload> {
  return json<PublicEventPayload>(`/v1/e/${encodeURIComponent(slug)}`);
}

export async function issueLivenessToken(slug: string): Promise<{ livenessToken: string }> {
  return json<{ livenessToken: string }>("/v1/auth/liveness-token", {
    method: "POST",
    body: JSON.stringify({ eventSlug: slug, challengeType: "blink" })
  });
}

export async function searchPhotos(slug: string, livenessToken: string, images: string[]): Promise<{ count: number; photos: SearchPhoto[]; sessionToken: string; indexingCount: number }> {
  return json<{ count: number; photos: SearchPhoto[]; sessionToken: string; indexingCount: number }>(`/v1/search/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: {
      "X-Liveness-Token": livenessToken
    },
    body: JSON.stringify({ images })
  });
}

export async function createZip(slug: string, sessionToken: string): Promise<{ jobId: string }> {
  return json<{ jobId: string }>(`/v1/search/${encodeURIComponent(slug)}/zip`, {
    method: "POST",
    headers: {
      "X-Search-Session": sessionToken
    }
  });
}

export async function getZipStatus(slug: string, jobId: string): Promise<{ status: string; downloadUrl?: string }> {
  return json<{ status: string; downloadUrl?: string }>(`/v1/search/${encodeURIComponent(slug)}/zip/${encodeURIComponent(jobId)}`);
}

export async function updateEvent(token: string, eventId: string, data: Partial<{ name: string; details: string; location: string; eventDate: string; status: string; thumbnailUrl: string }>): Promise<EventPayload> {
  const { thumbnailUrl, ...rest } = data;
  const payload = thumbnailUrl ? { ...rest, coverPhotoKey: thumbnailUrl } : rest;
  const updated = await json<EventPayload>(`/v1/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  return normalizeEvent(updated);
}

export async function deleteEvent(token: string, eventId: string): Promise<{ ok: true }> {
  return json<{ ok: true }>(`/v1/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getEvent(token: string, eventId: string): Promise<EventPayload> {
  const event = await json<EventPayload>(`/v1/events/${encodeURIComponent(eventId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeEvent(event);
}

export async function getEventQr(token: string, eventId: string): Promise<{ url: string; pngBase64: string }> {
  return json<{ url: string; pngBase64: string }>(`/v1/events/${encodeURIComponent(eventId)}/qr`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getEventIndexStatus(token: string, eventId: string): Promise<EventIndexStatus> {
  return json<EventIndexStatus>(`/v1/events/${encodeURIComponent(eventId)}/index-status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getEventPhotos(token: string, eventId: string, includeProcessing = true, personId?: string): Promise<EventPhoto[]> {
  const params = new URLSearchParams();
  if (includeProcessing) params.set("includeProcessing", "true");
  if (personId) params.set("personId", personId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return json<EventPhoto[]>(`/v1/events/${encodeURIComponent(eventId)}/photos${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getEventPeople(token: string, eventId: string): Promise<EventPerson[]> {
  return json<EventPerson[]>(`/v1/events/${encodeURIComponent(eventId)}/people`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function deletePhoto(token: string, eventId: string, photoId: string): Promise<{ ok: true }> {
  return json<{ ok: true }>(`/v1/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function retryPhoto(token: string, eventId: string, photoId: string): Promise<{ ok: true }> {
  return json<{ ok: true }>(`/v1/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}/retry`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export type PhotographerAnalytics = {
  totalViews: number;
  uniqueUsers: number;
  photosDelivered: number;
  totalPhotos: number;
  monthlyViews: number[];
  monthlyInteractions: number[];
  trends: {
    views: string;
    users: string;
    photos: string;
  };
};

export async function getPhotographerAnalytics(token: string): Promise<PhotographerAnalytics> {
  return json<PhotographerAnalytics>("/v1/analytics", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getPublicPersonPhotos(slug: string, personId: string): Promise<SearchPhoto[]> {
  return json<SearchPhoto[]>(`/v1/e/${encodeURIComponent(slug)}/people/${encodeURIComponent(personId)}/photos`);
}
