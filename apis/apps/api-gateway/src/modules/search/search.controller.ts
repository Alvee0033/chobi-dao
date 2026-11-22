import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { SearchService } from "./search.service";

@Controller("v1/search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Post(":slug")
  searchByFace(
    @Param("slug") slug: string,
    @Headers("x-liveness-token") livenessToken: string,
    @Body() dto: { image?: string; images?: string[] },
  ) {
    return this.search.search(slug, livenessToken, dto?.images ?? (dto?.image ? [dto.image] : []));
  }

  @Get(":slug/photos")
  sessionPhotos(
    @Param("slug") slug: string,
    @Headers("x-search-session") sessionToken: string,
    @Query("offset") rawOffset = "0",
  ) {
    const offset = Number(rawOffset);
    return this.search.getSessionPhotos(slug, sessionToken, offset);
  }

  @Post(":slug/zip")
  createZip(@Param("slug") slug: string, @Headers("x-search-session") sessionToken: string) {
    return this.search.createZip(slug, sessionToken);
  }

  @Post(":slug/photos/:photoId/removal-request")
  requestPhotoRemoval(@Param("slug") slug: string, @Param("photoId") photoId: string, @Headers("x-search-session") sessionToken: string) {
    return this.search.requestPhotoRemoval(slug, sessionToken, photoId);
  }

  @Post(":slug/photos/removal-requests/batch")
  requestPhotoRemovalBatch(@Param("slug") slug: string, @Headers("x-search-session") sessionToken: string, @Body() body: { photoIds?: string[] }) {
    return this.search.requestPhotoRemovals(slug, sessionToken, body?.photoIds ?? []);
  }

  @Get(":slug/zip/:jobId")
  zipStatus(@Param("slug") slug: string, @Param("jobId") jobId: string) {
    return this.search.zipStatus(slug, jobId);
  }
}
