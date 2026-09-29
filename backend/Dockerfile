# Multi-stage production Dockerfile for CampusFlow Core Backend

# Stage 1: Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies (including TypeScript)
RUN npm ci

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Prune devDependencies to keep image lean
RUN npm prune --omit=dev

# Stage 2: Lightweight Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Use non-root node user for container security
USER node

# Copy production node_modules, compiled dist, and package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000 50051

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
