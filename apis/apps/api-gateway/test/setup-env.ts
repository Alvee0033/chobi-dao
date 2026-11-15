process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://framefind:framefind@localhost:5432/framefind?schema=public";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
process.env.LIVENESS_TOKEN_SECRET = process.env.LIVENESS_TOKEN_SECRET || "dev-liveness-secret";
process.env.SEARCH_SESSION_SECRET = process.env.SEARCH_SESSION_SECRET || "dev-search-secret";
