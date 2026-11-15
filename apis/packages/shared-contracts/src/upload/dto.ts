export interface UploadUrlRequestDto { fileName: string; contentType: string; fileSizeBytes: number; fileHash?: string; }
export interface UploadUrlResponseDto {
  photoId: string;
  uploadUrl: string;
  key: string;
  expiresAt: string;
  requiredHeaders?: Record<string, string>;
}
export interface FinalizeUploadRequestDto { photoIds: string[]; }
export interface FinalizeUploadResponseDto { enqueued: number; skippedDuplicates: number; photoIds: string[]; }
export interface IndexStatusDto { total: number; indexed: number; failed: number; inProgress: number; }

export interface MultipartUploadInitRequestDto {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  fileHash?: string;
}
export interface MultipartUploadInitResponseDto {
  photoId: string;
  objectKey: string;
  uploadId: string;
  partSize: number;
  partCount: number;
}
export interface MultipartPresignPartsRequestDto {
  uploadId: string;
  partNumbers: number[];
}
export interface MultipartPresignPartsResponseDto {
  presignedUrls: Array<{ partNumber: number; url: string }>;
}
export interface MultipartCompleteRequestDto {
  uploadId: string;
  etags: Array<{ partNumber: number; etag: string }>;
}
