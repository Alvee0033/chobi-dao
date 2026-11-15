export interface SearchPhotoDto { id: string; thumbUrl: string; fullUrl: string; urlExpiresAt: string; similarity: number; }
export interface SearchResponseDto { count: number; photos: SearchPhotoDto[]; sessionToken: string; }
export interface ZipCreateResponseDto { jobId: string; }
export interface ZipStatusResponseDto { status: "queued" | "processing" | "ready" | "failed"; downloadUrl?: string; }
