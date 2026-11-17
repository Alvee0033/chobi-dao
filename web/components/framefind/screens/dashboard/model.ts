export type UploadItem = {
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

export const localPreviewCache: Record<string, string> = {};

export type SettingsState = { publicProfile: boolean; emailNotifications: boolean; autoOptimization: boolean };
