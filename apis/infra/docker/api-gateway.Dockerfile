FROM node:20-bookworm-slim
WORKDIR /workspace
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api-gateway ./apps/api-gateway
COPY packages/shared-contracts ./packages/shared-contracts
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --filter api-gateway... --filter @framefind/shared-contracts
RUN pnpm --filter @framefind/shared-contracts build && pnpm --filter api-gateway prisma:generate && pnpm --filter api-gateway build
CMD ["sh", "-c", "pnpm --filter api-gateway prisma:generate && pnpm --filter api-gateway prisma migrate deploy && node apps/api-gateway/dist/apps/api-gateway/src/main.js"]
