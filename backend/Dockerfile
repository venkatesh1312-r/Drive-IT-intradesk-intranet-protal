# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

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

# Only copy what's needed to run, not dev deps/source
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# Runs "npx prisma migrate deploy && node dist/main" (from package.json start script)
CMD ["npm", "run", "start"]
