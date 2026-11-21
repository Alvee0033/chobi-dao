import { z } from "zod";
export const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default("postgresql://framefind:framefind@localhost:5432/framefind?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().default("dev-access-secret"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret"),
  LIVENESS_TOKEN_SECRET: z.string().default("dev-liveness-secret"),
  SEARCH_SESSION_SECRET: z.string().default("dev-search-secret"),
  // Only trust forwarded client IP headers from explicitly configured proxy IPs/CIDRs.
  TRUST_PROXY: z.string().default(""),
  CORS_ORIGINS: z.string().default(""),
  // Google OAuth + Drive
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z.string().default("http://localhost:3001/v1/auth/google/callback"),
  // Billing
  STRIPE_SECRET_KEY: z.string().default("sk_test_mock"),
  BKASH_BASE_URL: z.string().url().default("https://checkout.sandbox.bka.sh/v1.2.0-beta"),
  BKASH_APP_KEY: z.string().default(""),
  BKASH_APP_SECRET: z.string().default(""),
  BKASH_USERNAME: z.string().default(""),
  BKASH_PASSWORD: z.string().default(""),
  BKASH_CALLBACK_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  UDDOKTAPAY_BASE_URL: z.string().url().default("https://sandbox.uddoktapay.com/api"),
  UDDOKTAPAY_API_KEY: z.string().default(""),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  API_BASE_URL: z.string().url().default("http://localhost:3001"),
  RESEND_API_KEY: z.string().default(""),
  AUTH_EMAIL_FROM: z.string().default(""),
  // AI Service (InsightFace self-hosted)
  AI_SERVICE_URL: z.string().default("http://localhost:8000"),
  // Local S3 / MinIO Storage Bucket & Local Filesystem
  STORAGE_DRIVER: z.enum(["minio", "s3", "local"]).default("minio"),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().default("minio"),
  S3_SECRET_ACCESS_KEY: z.string().default("minio123"),
  S3_BUCKET: z.string().default("chobi-photos"),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => (v ?? "true").toLowerCase() !== "false"),
  LOCAL_STORAGE_DIR: z.string().default("./storage/uploads"),
  // AWS Rekognition Credentials (legacy fallback)
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  ENABLE_PEOPLE_STORIES: z
    .string()
    .optional()
    .transform((v) => (v ?? "true").toLowerCase() !== "false"),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") return;
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "LIVENESS_TOKEN_SECRET", "SEARCH_SESSION_SECRET"] as const) {
    if (env[key].length < 32 || env[key].startsWith("dev-") || env[key].includes("chobi_super_")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: "Must be a unique secret of at least 32 characters in production" });
    }
  }
  if (env.STORAGE_DRIVER !== "local" && (env.S3_ACCESS_KEY_ID.length < 8 || env.S3_ACCESS_KEY_ID === "minio" || env.S3_SECRET_ACCESS_KEY.length < 24 || env.S3_SECRET_ACCESS_KEY === "minio123")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["S3_SECRET_ACCESS_KEY"], message: "Production object storage credentials must be explicitly configured; use an 8+ character username and 24+ character password" });
  }
  if (!env.TRUST_PROXY.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["TRUST_PROXY"], message: "Set the trusted Coolify proxy IP/CIDR so client IP based throttles cannot be spoofed or collapsed to one proxy address" });
  }
});
export type AppEnv = z.infer<typeof envSchema>;
export const parseEnv = (): AppEnv => envSchema.parse(process.env);

