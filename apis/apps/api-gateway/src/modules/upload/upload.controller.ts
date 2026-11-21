import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import { UploadService } from "./upload.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { FinalizeUploadRequestDto, MultipartCompleteRequestDto, MultipartPresignPartsRequestDto, MultipartUploadInitRequestDto, UploadUrlRequestDto } from "@framefind/shared-contracts";
import { AuthRoles } from "../../common/auth/auth-role.decorator";

@Controller("v1/events/:id")
@UseGuards(JwtAuthGuard)
@AuthRoles("photographer")
export class UploadController {
  constructor(private readonly upload: UploadService) {}
  @Post("upload-url")
  create(
    @Req() req: { user: { id: string }; headers: { authorization?: string; host?: string; "x-forwarded-proto"?: string } },
    @Param("id") id: string,
    @Body() dto: UploadUrlRequestDto
  ) {
    const proto = req.headers["x-forwarded-proto"] ?? "http";
    const host = req.headers.host ?? "localhost:3001";
    const apiBase = `${proto}://${host}`;
    return this.upload.createUploadUrl(req.user.id, id, dto, apiBase, req.headers.authorization);
  }
  @Put("photos/:photoId/upload-direct")
  async uploadDirect(
    @Req() req: {
      user: { id: string };
      headers: { "content-type"?: string };
      body?: Buffer;
    },
    @Param("id") id: string,
    @Param("photoId") photoId: string
  ) {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const contentType = req.headers["content-type"] ?? "application/octet-stream";
    return this.upload.uploadDirect(req.user.id, id, photoId, body, contentType);
  }
  @Post("photos/upload/init") initMultipart(@Req() req: { user: { id: string } }, @Param("id") id: string, @Body() dto: MultipartUploadInitRequestDto) {
    return this.upload.initMultipartUpload(req.user.id, id, dto);
  }
  @Post("photos/:photoId/upload/parts") presignMultipartParts(@Req() req: { user: { id: string } }, @Param("id") id: string, @Param("photoId") photoId: string, @Body() dto: MultipartPresignPartsRequestDto) {
    return this.upload.presignMultipartParts(req.user.id, id, photoId, dto);
  }
  @Post("photos/:photoId/upload/complete") completeMultipart(@Req() req: { user: { id: string } }, @Param("id") id: string, @Param("photoId") photoId: string, @Body() dto: MultipartCompleteRequestDto) {
    return this.upload.completeMultipartUpload(req.user.id, id, photoId, dto);
  }
  @Get("photos") photos(
    @Req() req: { user: { id: string } },
    @Param("id") id: string,
    @Query("includeProcessing") includeProcessing?: string,
    @Query("personId") personId?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    const headers = (req as unknown as { headers?: { host?: string; "x-forwarded-proto"?: string } }).headers ?? {};
    const proto = headers["x-forwarded-proto"] ?? "http";
    const host = headers.host ?? "localhost:3001";
    const apiBase = `${proto}://${host}`;
    return this.upload.photos(req.user.id, id, includeProcessing === "true", apiBase, personId, Number(limit) || 48, cursor);
  }
  @Get("people")
  people(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    const headers = (req as unknown as { headers?: { host?: string; "x-forwarded-proto"?: string } }).headers ?? {};
    const proto = headers["x-forwarded-proto"] ?? "http";
    const host = headers.host ?? "localhost:3001";
    const apiBase = `${proto}://${host}`;
    return this.upload.people(req.user.id, id, apiBase);
  }
  @Get("people/:personId/photos")
  personPhotos(
    @Req() req: { user: { id: string } },
    @Param("id") id: string,
    @Param("personId") personId: string,
    @Query("includeProcessing") includeProcessing?: string,
  ) {
    const headers = (req as unknown as { headers?: { host?: string; "x-forwarded-proto"?: string } }).headers ?? {};
    const proto = headers["x-forwarded-proto"] ?? "http";
    const host = headers.host ?? "localhost:3001";
    const apiBase = `${proto}://${host}`;
    return this.upload.photos(req.user.id, id, includeProcessing === "true", apiBase, personId);
  }
  @Patch("finalize-upload") finalize(@Req() req: { user: { id: string } }, @Param("id") id: string, @Body() dto: FinalizeUploadRequestDto) {
    return this.upload.finalizeUpload(req.user.id, id, dto.photoIds);
  }
  @Get("index-status") status(@Req() req: { user: { id: string } }, @Param("id") id: string) { return this.upload.status(req.user.id, id); }
  @Post("photos/:photoId/retry") retry(@Req() req: { user: { id: string } }, @Param("id") id: string, @Param("photoId") photoId: string) { return this.upload.retry(req.user.id, id, photoId); }
  @Delete("photos/:photoId") remove(@Req() req: { user: { id: string } }, @Param("id") id: string, @Param("photoId") photoId: string) { return this.upload.deletePhoto(req.user.id, id, photoId); }
  @Get("photo-removal-requests") removalRequests(@Req() req: { user: { id: string }; headers: { host?: string; "x-forwarded-proto"?: string } }, @Param("id") id: string) { const proto = req.headers["x-forwarded-proto"] ?? "http"; const host = req.headers.host ?? "localhost:3001"; return this.upload.removalRequests(req.user.id, id, `${proto}://${host}`); }
  @Post("photo-removal-requests/:requestId") reviewRemovalRequest(@Req() req: { user: { id: string } }, @Param("id") id: string, @Param("requestId") requestId: string, @Body() body: { approve?: boolean }) { return this.upload.reviewRemovalRequest(req.user.id, id, requestId, body.approve === true); }
  @Get("deleted-photos") deletedPhotos(@Req() req: { user: { id: string } }, @Param("id") id: string) { return this.upload.deletedPhotos(req.user.id, id); }
  @Post("photos/:photoId/restore") restorePhoto(@Req() req: { user: { id: string } }, @Param("id") id: string, @Param("photoId") photoId: string) { return this.upload.restorePhoto(req.user.id, id, photoId); }
}

@Controller("v1/media")
export class UploadMediaController {
  constructor(private readonly upload: UploadService) {}

  @Get("photos/:photoId/:variant")
  async photoMedia(
    @Param("photoId") photoId: string,
    @Param("variant") variant: "image" | "thumb",
    @Query("t") t: string,
    @Res() res: any,
  ) {
    const media = await this.upload.getPhotoMedia(photoId, variant, t);
    res.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.header("Content-Type", media.contentType);
    return res.send(media.stream as any);
  }
}
