export const EVENT_STATUSES = ["draft", "indexing", "active", "paused", "archived", "expired"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const PHOTO_INDEX_STATUSES = ["pending", "uploaded", "indexing", "indexed", "failed"] as const;
export type PhotoIndexStatus = (typeof PHOTO_INDEX_STATUSES)[number];

export const PLAN_TYPES = ["free", "pro", "agency"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const TOKEN_DEFAULTS = {
  accessTtlSeconds: 900,
  refreshTtlSeconds: 604800,
  livenessTtlSeconds: 300,
  searchSessionTtlSeconds: 3600
} as const;

export const SEARCH_DEFAULTS = {
  similarityThreshold: 0.68,
  maxResults: 200,
  maxUploadFileSizeBytes: 50 * 1024 * 1024,
  maxFinalizeBatchSize: 500
} as const;
