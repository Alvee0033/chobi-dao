FROM node:20-bookworm-slim
WORKDIR /workspace
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-contracts ./packages/shared-contracts
COPY apps/api-gateway ./apps/api-gateway
COPY apps/worker ./apps/worker
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --filter worker... --filter api-gateway... --filter @framefind/shared-contracts
RUN pnpm --filter @framefind/shared-contracts build
RUN cd apps/api-gateway && npx prisma generate --schema=./prisma/schema.prisma
RUN cd apps/worker && npx nest build
CMD ["node", "apps/worker/dist/main.js"]


