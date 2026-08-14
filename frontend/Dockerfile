# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# NEXT_PUBLIC_* vars must be present at BUILD time (baked into the JS bundle),
# not just at runtime. Default to this server's addresses; override with
# --build-arg if deploying elsewhere.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/
ARG NEXT_PUBLIC_CHATBOT_URL=http://localhost:4000/
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CHATBOT_URL=$NEXT_PUBLIC_CHATBOT_URL

RUN npm run build

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

CMD ["npm", "run", "start"]
