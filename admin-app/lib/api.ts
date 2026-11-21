const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api-chobi.203.96.190.78.sslip.io";

export type Owner = { email: string; name: string; mustChangePassword: boolean };
export type Overview = {
  users: number;
  photographers: number;
  events: number;
  photos: number;
  activeSubscriptions: number;
  trials: number;
  pendingPayments: number;
  successfulMatches: number;
  failedPhotos: number;
  storageBytes: number;
  revenueBdt: number;
};
export type DataTab = "users" | "photographers" | "events" | "subscriptions" | "trials" | "failures" | "audit";
export type RecordRow = Record<string, unknown>;
export type Page = { items: RecordRow[]; nextCursor: string | null; hasMore: boolean };

export async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message.join(". ") : payload.message;
    throw new Error(typeof message === "string" ? message : `Request failed (${response.status})`);
  }
  return payload as T;
}

export function getPage(tab: DataTab, token: string, query: string, cursor?: string): Promise<Page> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (cursor) params.set("cursor", cursor);
  return request<Page>(`/v1/admin/${tab}?${params}`, token);
}
