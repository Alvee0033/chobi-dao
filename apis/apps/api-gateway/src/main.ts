import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { AppModule } from "./app.module";
import { parseEnv } from "./config/env";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";

type RequestLogInput = {
  method?: string;
  url?: string;
  hostname?: string;
  host?: string;
  headers?: { host?: string };
  ip?: string;
  socket?: { remoteAddress?: string };
};

function sanitizeRequestLog(input: unknown) {
  const request = input as RequestLogInput;
  return {
    method: request.method ?? "UNKNOWN",
    url: (request.url ?? "").split("?", 1)[0],
    host: request.hostname ?? request.host ?? request.headers?.host,
    remoteAddress: request.ip ?? request.socket?.remoteAddress,
  };
}

async function bootstrap() {
  const env = parseEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: {
        serializers: {
          req: sanitizeRequestLog,
        },
      },
      trustProxy: env.TRUST_PROXY ? env.TRUST_PROXY.split(",").map((entry) => entry.trim()).filter(Boolean) : false,
      bodyLimit: 12 * 1024 * 1024,
    }),
  );
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addContentTypeParser(
    ["application/octet-stream", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    { parseAs: "buffer", bodyLimit: 100 * 1024 * 1024 },
    (_req: unknown, body: Buffer, done: (err: Error | null, parsedBody?: Buffer) => void) => done(null, body),
  );
  await app.register(cookie);
  await app.register(multipart);
  const allowedOrigins = new Set([
    new URL(env.APP_BASE_URL).origin,
    ...env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
  ]);
  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || allowedOrigins.has(requestOrigin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Liveness-Token", "X-Search-Session", "Range", "Cache-Control", "If-Modified-Since", "Keep-Alive", "User-Agent", "X-Requested-With"]
  });
  app.setGlobalPrefix("");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const config = new DocumentBuilder().setTitle("FrameFind API").setVersion("1.0").addBearerAuth().build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  await app.listen(env.PORT, "0.0.0.0");
}

bootstrap();
