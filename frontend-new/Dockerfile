# frontend-new/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL=http://127.0.0.1:8000
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm run build

FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ARG VITE_API_URL=http://127.0.0.1:8000
ENV PORT=3000
ENV VITE_API_URL=$VITE_API_URL
EXPOSE 3000

CMD ["node", "dist/server/node-build.mjs"]
