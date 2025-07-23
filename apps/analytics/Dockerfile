# Base stage - common dependencies
FROM node:22-alpine AS base
WORKDIR /app
COPY apps/analytics/package*.json ./
RUN npm install

# Development stage
FROM base AS dev
ENV NODE_ENV=development

COPY apps/analytics ./

EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage for production
FROM base AS build
COPY apps/analytics ./
RUN npm run build

# Production stage
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "server/index.mjs"]
