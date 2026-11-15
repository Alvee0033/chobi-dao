FROM node:20-bookworm-slim
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker ./apps/worker
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --filter worker...
RUN pnpm --filter worker build
CMD ["node", "apps/worker/dist/main.js"]
