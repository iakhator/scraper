# Build
FROM node:22-alpine AS build
WORKDIR /app
COPY ./apps/analytics ./
RUN npm install
RUN npm run build

# Run
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/.output ./
EXPOSE 3000
CMD ["node", "server/index.mjs"]
