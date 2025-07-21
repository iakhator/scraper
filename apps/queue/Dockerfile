# Base stage - install dependencies from GitHub Packages
FROM node:22-alpine AS deps
WORKDIR /app

# Copy authentication and package files
COPY apps/queue/package*.json ./

# Install dependencies from GitHub Packages
ARG GITHUB_TOKEN
RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc && \
    npm ci --only=production && \
    rm .npmrc

# Development stage
FROM node:22-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development

# Copy package files and install all dependencies
COPY apps/queue/package*.json ./
ARG GITHUB_TOKEN
RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc && \
    npm ci && \
    rm .npmrc

# Copy source code
COPY apps/queue/src ./src
COPY apps/queue/tsconfig.json ./

EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage - compile TypeScript
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files and tsconfig
COPY apps/queue/package*.json ./
COPY apps/queue/tsconfig.json ./

# Install all dependencies (including dev)
ARG GITHUB_TOKEN
RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc && \
    npm ci && \
    rm .npmrc

# Copy source and build
COPY apps/queue/src ./src
RUN npm run build

# Production stage
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy built application
COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/index.js"]
