import { Body, Controller, Get, Headers, Param, Post, Req } from "@nestjs/common";
import { SearchService } from "./search.service";

@Controller("v1/search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Post(":slug")
  searchByFace(
    @Req() req: { headers: { host?: string; "x-forwarded-proto"?: string } },
    @Param("slug") slug: string,
    @Headers("x-liveness-token") livenessToken: string,
    @Body() dto: { image?: string; images?: string[] },
  ) {
    const proto = req.headers["x-forwarded-proto"] ?? "http";
    const host = req.headers.host ?? "localhost:3001";
    const apiBase = `${proto}://${host}`;
    return this.search.search(slug, livenessToken, dto?.images ?? (dto?.image ? [dto.image] : []), apiBase);
  }

  @Post(":slug/zip")
  createZip(@Param("slug") slug: string, @Headers("x-search-session") sessionToken: string) {
    return this.search.createZip(slug, sessionToken);
  }

  @Get(":slug/zip/:jobId")
  zipStatus(@Param("slug") slug: string, @Param("jobId") jobId: string) {
    return this.search.zipStatus(slug, jobId);
  }
}
