# Base stage - common dependencies
FROM node:22-alpine AS base
WORKDIR /app

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  freetype-dev \
  harfbuzz \
  ca-certificates \
  ttf-freefont

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S worker -u 1001 -G nodejs

# Dependencies stage - install from GitHub Packages
FROM base AS deps
WORKDIR /app

# Copy authentication and package files
COPY .npmrc ./
COPY apps/worker/package*.json ./

# Install production dependencies
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN
RUN npm ci --only=production && \
    npm cache clean --force

# Development stage
FROM base AS dev
ENV NODE_ENV=development
WORKDIR /app

# Copy auth and install all dependencies
COPY .npmrc ./
COPY apps/worker/package*.json ./
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN
RUN npm ci

# Copy source code
COPY apps/worker/src ./src
COPY apps/worker/tsconfig.json ./tsconfig.json
RUN chown -R worker:nodejs /app
USER worker
CMD ["npm", "run", "dev"]

# Build stage for production
FROM base AS builder
WORKDIR /app

# Copy auth and dependencies
COPY .npmrc ./
COPY apps/worker/package*.json ./
COPY apps/worker/tsconfig.json ./

# Install all dependencies (including dev)
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN
RUN npm ci

# Copy source and build
COPY apps/worker/src ./src
RUN npm run build

# Production stage
FROM base AS prod
WORKDIR /app
ENV NODE_ENV=production

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy built application
COPY --from=builder /app/dist ./dist

RUN chown -R worker:nodejs /app
USER worker

# Worker runs as a daemon - no exposed ports needed
CMD ["node", "dist/index.js"]
