# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client from schema.prisma (must run after prisma/ is copied)
RUN npx prisma generate

# Compile NestJS TypeScript -> dist/
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# Only copy what's needed to run, not dev deps/source
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Runs migrations (auto-baselines pre-existing schema if needed), then starts the app
CMD ["./docker-entrypoint.sh"]
