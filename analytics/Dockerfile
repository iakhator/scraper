# Use Node.js 18 LTS as base image
FROM node:22-alpine AS base
WORKDIR /app
COPY analytics/package*.json ./
COPY analytics/vite.config.ts ./


# Development stage
FROM base AS dev
ENV NODE_ENV=development
# Clean install to avoid platform-specific binary issues
# RUN rm -rf node_modules package-lock.json
RUN npm install
COPY analytics ./

# Expose port for Vite dev server
EXPOSE 8000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
COPY analytics ./
RUN npm run build

# Production stage
FROM nginx:alpine AS production
# Install curl for health checks
RUN apk add --no-cache curl

#  Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
