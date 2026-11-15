import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Auth integration", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /v1/auth/signup", async () => {
    await request(app.getHttpServer())
      .post("/v1/auth/signup")
      .send({ email: `test-${Date.now()}@example.com`, password: "password123", name: "Tester" })
      .expect((res: { body: { accessToken?: string; refreshToken?: string; photographer?: { hasDriveConnected?: boolean; driveRootFolderId?: string | null } } }) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        expect(res.body.photographer?.hasDriveConnected).toBe(false);
        expect(res.body.photographer?.driveRootFolderId ?? null).toBeNull();
      });
  });
});
