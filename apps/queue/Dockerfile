# Base stage - common dependencies
FROM node:22-alpine AS base
WORKDIR /app

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

# Install queue app dependencies
COPY package.json package-lock.json ./
RUN npm install

# Development stage
FROM base AS dev
ENV NODE_ENV=development
COPY . ./
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage for production
FROM base AS build
WORKDIR /app
# Copy all queue files to ensure everything is available
COPY . ./
RUN npm run build

# Production stage
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
EXPOSE 3001
CMD ["node", "dist/index.js"]
