ARG NODE_VERSION=24.13.0-slim

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ============================================
# Stage 2: Migrate target (used by docker compose migrate service)
# ============================================
FROM node:${NODE_VERSION} AS migrate
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json drizzle.config.ts ./
COPY lib/db/ ./lib/db/
CMD ["npx", "drizzle-kit", "push"]

# ============================================
# Stage 3: Build Next.js
# ============================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm run build

# ============================================
# Stage 4: Production runner
# ============================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir .next && chown node:node .next
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
