import { envSchema } from "./env";

describe("production environment secrets", () => {
  it("does not trust forwarded addresses unless proxy ranges are configured", () => {
    expect(envSchema.parse({}).TRUST_PROXY).toBe("");
    expect(envSchema.parse({ TRUST_PROXY: "10.0.0.0/8, 127.0.0.1" }).TRUST_PROXY)
      .toBe("10.0.0.0/8, 127.0.0.1");
  });

  it("rejects development or short JWT secrets in production", () => {
    expect(envSchema.safeParse({ NODE_ENV: "production" }).success).toBe(false);
    expect(envSchema.safeParse({
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: "a".repeat(40),
      JWT_REFRESH_SECRET: "b".repeat(40),
      LIVENESS_TOKEN_SECRET: "c".repeat(40),
      SEARCH_SESSION_SECRET: "d".repeat(40),
      TRUST_PROXY: "10.0.0.0/8",
      S3_ACCESS_KEY_ID: "chobiadmin",
      S3_SECRET_ACCESS_KEY: "prod-secret-key-12345678901234567890",
    }).success).toBe(true);
  });
});
