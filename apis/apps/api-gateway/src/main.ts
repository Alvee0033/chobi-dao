import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { AppModule } from "./app.module";
import { parseEnv } from "./config/env";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const env = parseEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 100 * 1024 * 1024 }),
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
      // allow all origins to avoid CORS issues, especially from production domain to vercel backend
      callback(null, true);
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
