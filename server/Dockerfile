# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl curl

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

RUN apk add --no-cache openssl curl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

RUN npm ci --only=production && \
    npm cache clean --force

# Install dev dependencies needed for prisma db seed
# We install them locally, not globally, to be accessible by ts-node
RUN npm install ts-node typescript @types/bcrypt

RUN npx prisma generate

COPY --from=builder /app/dist /app/dist

RUN mkdir -p /app/uploads /app/logs && \
    chown -R node:node /app/uploads /app/logs /app/dist

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health/liveness || exit 1

CMD ["node", "dist/src/main.js"]
