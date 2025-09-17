FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Development Stage
FROM base AS dev
ENV NODE_ENV=development

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

COPY . .

EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage - compile TypeScript
FROM base AS build

COPY package*.json ./
# Copy source code
COPY . .
# Build the application
RUN npm run build

# Production stage
FROM base AS prod
ENV NODE_ENV=production
# Expose the port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
