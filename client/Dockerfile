# --- deps ---
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ---
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Needs to be a real URL at build time only for env var validation;
# actual API calls happen client-side at runtime.
ARG NEXT_PUBLIC_API_URL=http://localhost:5003/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# --- production image ---
FROM node:20-slim AS production
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd -r nodejs && useradd -r -g nodejs nodeuser

# `output: "standalone"` in next.config.ts produces a minimal self-contained
# server — this is the whole point of using it, we don't need the full
# node_modules tree in the final image.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nodeuser:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodeuser:nodejs /app/.next/static ./.next/static

USER nodeuser

EXPOSE 3003
ENV PORT=3003

CMD ["node", "server.js"]
