FROM node:20-bookworm-slim
WORKDIR /workspace
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-contracts ./packages/shared-contracts
COPY apps/api-gateway ./apps/api-gateway
COPY apps/worker ./apps/worker
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --filter worker... --filter api-gateway... --filter @framefind/shared-contracts
RUN pnpm --filter @framefind/shared-contracts build && pnpm --filter api-gateway prisma:generate && pnpm --filter worker build
CMD ["node", "apps/worker/dist/main.js"]

