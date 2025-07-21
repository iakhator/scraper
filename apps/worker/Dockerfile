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
    adduser -S worker -u 1001

# Copy packages and build them
COPY packages/ ./packages/
WORKDIR /app/packages/types
RUN npm ci && npm run build

WORKDIR /app/packages/logger  
RUN npm ci && npm run build

WORKDIR /app/packages/aws-wrapper
RUN npm ci && npm run build

WORKDIR /app/packages/core
RUN npm ci && npm run build

# Install worker app dependencies
COPY apps/worker/package.json /app/apps/worker/package.json
WORKDIR /app/apps/worker
RUN npm install

# Development stage
FROM base AS dev
ENV NODE_ENV=development
WORKDIR /app/apps/worker
COPY apps/worker/ ./
RUN chown -R worker:nodejs /app
USER worker
CMD ["npm", "run", "dev"]

# Build stage for production
FROM base AS build
WORKDIR /app/apps/worker
COPY apps/worker/ ./
RUN npm run build

# Production stage
FROM node:22-alpine AS prod
WORKDIR /app

# Install Chromium and dependencies for production
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Add non-root user for production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S worker -u 1001

COPY --from=build /app/apps/worker/dist ./dist
COPY --from=build /app/apps/worker/package.json ./
COPY --from=build /app/apps/worker/node_modules ./node_modules
COPY --from=build /app/packages ./packages

RUN chown -R worker:nodejs /app
USER worker

# Worker runs as a daemon - no exposed ports needed
CMD ["node", "dist/index.js"]
