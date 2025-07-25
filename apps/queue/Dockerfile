# Production dependencies stage
# FROM node:22-alpine AS prod-deps
# WORKDIR /app

# # Copy package files
# COPY apps/queue/package*.json ./

# # Install production dependencies from GitHub Packages
# ARG GITHUB_TOKEN
# RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
#     echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc && \
#     rm -f package-lock.json && \
#     npm install --only=production && \
#     rm .npmrc- install dependencies from GitHub Packages
# FROM node:22-alpine AS deps
# WORKDIR /app

# # Copy authentication and package files
# COPY apps/queue/package*.json ./

# # Install dependencies from GitHub Packages
# ARG GITHUB_TOKEN
# RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
#     echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc && \
#     npm ci --only=production && \
#     rm .npmrc

# # Development stage
# FROM node:22-alpine AS dev
# WORKDIR /app
# ENV NODE_ENV=development

# # Copy package files and install all dependencies
# COPY apps/queue/package*.json ./
# ARG GITHUB_TOKEN
# RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
#     echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc && \
#     rm -f package-lock.json && \
#     npm install && \
#     rm .npmrc

# # Copy source code
# COPY apps/queue/src ./src
# COPY apps/queue/tsconfig.json ./

# EXPOSE 3001
# CMD ["npm", "run", "dev"]

# # Build stage - compile TypeScript
# FROM node:22-alpine AS builder
# WORKDIR /app

# # Copy package files and tsconfig
# COPY apps/queue/package*.json ./
# COPY apps/queue/tsconfig.json ./

# # Install all dependencies (including dev)
# ARG GITHUB_TOKEN
# RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
#     echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc && \
#     rm -f package-lock.json && \
#     npm install && \
#     rm .npmrc

# # Copy source and build
# COPY apps/queue/src ./src
# RUN npm run build

# # Production stage
# FROM node:22-alpine AS prod
# WORKDIR /app
# ENV NODE_ENV=production

# # Copy production dependencies from prod-deps stage
# COPY --from=prod-deps /app/node_modules ./node_modules
# COPY --from=prod-deps /app/package*.json ./

# # Copy built application
# COPY --from=builder /app/dist ./dist

# EXPOSE 3001
# CMD ["node", "dist/index.js"]



FROM node:22-alpine AS base
WORKDIR /app

# Development stage  
FROM base AS dev
ENV NODE_ENV=development

# Copy package files and install all dependencies (apps/queue prefix for root context)
COPY apps/queue/package*.json ./
ARG REPO_TOKEN
RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
  echo "//npm.pkg.github.com/:_authToken=${REPO_TOKEN}" >> .npmrc && \
  rm -f package-lock.json && \
  npm install && \
  rm .npmrc

# Copy source code (apps/queue prefix for root context)
COPY apps/queue ./

EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage - compile TypeScript
FROM base AS build

# Copy package files and tsconfig (apps/queue prefix for root context)
COPY apps/queue/package*.json  ./

# Install all dependencies (including dev)
ARG REPO_TOKEN
RUN echo "@iakhator:registry=https://npm.pkg.github.com" > .npmrc && \
  echo "//npm.pkg.github.com/:_authToken=${REPO_TOKEN}" >> .npmrc && \
  rm -f package-lock.json && \
  npm install && \
  rm .npmrc

# Copy source and build (apps/queue prefix for root context)
COPY apps/queue/ ./

RUN npm run build

# Production stage
FROM base AS prod
ENV NODE_ENV=production

# Copy production dependencies from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./


EXPOSE 3001
CMD ["node", "dist/index.js"]
