export interface UsageDto { plan: "free" | "pro" | "agency"; photosUsed: number; photosLimit: number; storageUsedBytes: number; storageLimitBytes: number; }
export interface BillingPortalResponseDto { url: string; }
