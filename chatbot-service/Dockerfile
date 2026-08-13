# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client for the pgvector schema
RUN npx prisma generate

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/controllers ./controllers
COPY --from=builder /app/config ./config
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/services ./services
COPY --from=builder /app/routes ./routes

# Runtime folder for uploaded policy PDFs — created in image in case
# it's not mounted as a volume in the deploy setup
RUN mkdir -p uploads

EXPOSE 4000

# Runs "npx prisma migrate deploy && node server.js" (from package.json start script)
CMD ["npm", "run", "start"]
