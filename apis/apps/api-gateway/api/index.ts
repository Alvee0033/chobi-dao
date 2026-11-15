import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { AppModule } from "../src/app.module";
import { GlobalHttpExceptionFilter } from "../src/common/filters/http-exception.filter";

let appPromise: Promise<any> | null = null;
let fastifyPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({ logger: false, bodyLimit: 100 * 1024 * 1024 }),
      );
      const fastify = app.getHttpAdapter().getInstance();
      fastify.addContentTypeParser(
        ["application/octet-stream", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
        { parseAs: "buffer", bodyLimit: 100 * 1024 * 1024 },
        (_req: unknown, body: Buffer, done: (err: Error | null, parsedBody?: Buffer) => void) => done(null, body),
      );

      await app.register(cookie);
      await app.register(multipart);
      app.enableCors({
        origin: (requestOrigin, callback) => {
          callback(null, true);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Liveness-Token", "X-Search-Session", "Range", "Cache-Control", "If-Modified-Since", "Keep-Alive", "User-Agent", "X-Requested-With"],
      });
      app.setGlobalPrefix("");
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      app.useGlobalFilters(new GlobalHttpExceptionFilter());
      await app.init();
      return app;
    })();
  }
  return appPromise;
}

async function getFastifyInstance() {
  if (!fastifyPromise) {
    fastifyPromise = (async () => {
      const app = await getApp();
      const fastify = app.getHttpAdapter().getInstance();
      await fastify.ready();
      return fastify;
    })();
  }
  return fastifyPromise;
}

export default async function handler(req: any, res: any) {
  const fastify = await getFastifyInstance();
  return fastify.routing(req, res);
}
