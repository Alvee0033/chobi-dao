FROM node:20-bookworm-slim
WORKDIR /workspace
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api-gateway/prisma ./apps/api-gateway/prisma
COPY apps/api-gateway/package.json ./apps/api-gateway/package.json
COPY apps/worker ./apps/worker
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --filter worker... --filter api-gateway...
RUN cd apps/api-gateway && npx prisma generate --schema=./prisma/schema.prisma
RUN pnpm --filter worker build
CMD ["node", "apps/worker/dist/main.js"]

