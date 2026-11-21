export type UploadItem = {
  id: string;
  photoId?: string;
  eventId: string;
  file?: File;
  fileName: string;
  previewObjectUrl?: string;
  progress: number;
  status: "queued" | "uploading" | "processing" | "ready" | "failed" | "canceled";
  fileHash?: string;
  error?: string;
  abort?: AbortController;
};

export type UploadSummary = {
  total: number;
  preparing: number;
  uploaded: number;
  failed: number;
};

export const localPreviewCache: Record<string, string> = {};
