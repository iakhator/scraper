# Base stage - common dependencies
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Development stage
FROM base AS dev
ENV NODE_ENV=development
COPY . ./
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage for production
FROM base AS build
COPY . ./
RUN npm run build

# Production stage
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./
EXPOSE 3000
CMD ["node", "server/index.mjs"]
