import { z } from "zod";
export const workerEnvSchema = z.object({
  PORT: z.coerce.number().default(3002),
  REDIS_URL: z.string(),
  DATABASE_URL: z.string(),
  AI_SERVICE_URL: z.string().default("http://ai-service:8000"),
  LOCAL_STORAGE_DIR: z.string().default("/storage/uploads"),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().default("framefind")
});
export const workerEnv = () => workerEnvSchema.parse(process.env);
