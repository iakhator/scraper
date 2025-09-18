FROM node:22-alpine AS base
WORKDIR /app

# Development Stage
FROM base AS dev
ENV NODE_ENV=development

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

COPY backend ./

EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage - compile TypeScript
FROM base AS build

COPY backend/package*.json ./
# Copy source code
COPY backend ./
# Build the application
RUN npm run build

# Production stage
FROM base AS prod
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
# Expose the port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
