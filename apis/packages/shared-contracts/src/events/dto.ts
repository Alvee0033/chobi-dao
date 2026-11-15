import type { EventStatus } from "../common/enums";
export interface CreateEventDto { name: string; details?: string; eventDate?: string; location?: string; password?: string; expiresAt?: string; }
export interface UpdateEventDto { name?: string; details?: string; eventDate?: string; location?: string; password?: string; expiresAt?: string; status?: EventStatus; coverPhotoKey?: string; thumbnailUrl?: string; }
export interface EventDto { id: string; slug: string; name: string; details?: string | null; status: EventStatus; eventDate?: string | null; location?: string | null; totalPhotos: number; indexedPhotos: number; createdAt: string; updatedAt: string; }
