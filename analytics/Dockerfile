# Use Node.js 18 LTS as base image
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Development stage
FROM base AS development
ENV NODE_ENV=development
COPY . .

# Expose port for Vite dev server
EXPOSE 8080
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN npm run build

# Production stage
FROM build AS production
ENV NODE_ENV=production

COPY --from=build /app/.output ./
COPY --from=build /app/node_modules ./node_modules

# Expose port 80
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
