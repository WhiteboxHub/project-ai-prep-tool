# frontend-new/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build both client SPA and server bundle
RUN npm run build

# Stage 2: Run environment
FROM node:20-alpine

WORKDIR /app

# Copy built package and output from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Default Cloud Run port environment
ENV PORT=3000
EXPOSE 3000

# Start production server
CMD ["node", "dist/server/node-build.mjs"]
