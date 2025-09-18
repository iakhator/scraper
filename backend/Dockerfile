FROM node:22-alpine AS base
WORKDIR /app
COPY backend/package*.json ./

# Development Stage
FROM base AS dev
ENV NODE_ENV=development

# Copy package files

# Install dependencies
RUN npm install

COPY backend ./

EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage - compile TypeScript
FROM base AS build
ENV NODE_ENV=development

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy source code
COPY backend ./

# Build the application
RUN npm run build

# Production stage
FROM base AS prod
ENV NODE_ENV=production

# Copy package files and install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Expose the port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
