# Base stage - common setup
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

# Development stage
FROM base AS dev
ENV NODE_ENV=development

# Copy package files and install all dependencies
COPY apps/worker/package*.json ./
ARG REPO_TOKEN
RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
  echo "//npm.pkg.github.com/:_authToken=${REPO_TOKEN}" >> .npmrc && \
  rm -f package-lock.json && \
  npm install && \
  rm .npmrc

# Copy source code
COPY apps/worker/ ./
RUN chown -R worker:nodejs /app
USER worker
CMD ["npm", "run", "dev"]

# Build stage for production
FROM base AS build

# Copy package files and tsconfig
COPY apps/worker/package*.json ./
COPY apps/worker/tsconfig.json ./

# Install all dependencies (including dev)
ARG REPO_TOKEN
RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
  echo "//npm.pkg.github.com/:_authToken=${REPO_TOKEN}" >> .npmrc && \
  rm -f package-lock.json && \
  npm install && \
  rm .npmrc

# Copy source and build
COPY apps/worker/ ./
RUN npm run build

# Production stage
FROM base AS prod
ENV NODE_ENV=production

# Copy production dependencies from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

RUN chown -R worker:nodejs /app
USER worker

# Worker runs as a daemon - no exposed ports needed
CMD ["node", "dist/index.js"]
