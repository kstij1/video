# =========================
#  Dependencies stage
# =========================
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat bash curl
WORKDIR /app
# Copy package files
COPY package.json package-lock.json* ./
# Install deps
RUN npm ci --only=production
# =========================
#  Build stage
# =========================
FROM node:18-alpine AS builder
WORKDIR /app
# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy all project files
COPY . .
# Build the client
WORKDIR /app/client
RUN npm ci
RUN npm run build
# =========================
#  Runtime stage
# =========================
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Create non-root user
RUN addgroup -S nodejs -g 1001 && adduser -S appuser -u 1001
# Copy server files
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
# Copy built client
COPY --from=builder /app/client/build ./client/build
# Copy client package.json for serving static files
COPY --from=builder /app/client/package.json ./client/
# Set ownership
RUN chown -R appuser:nodejs /app
USER appuser
# Expose ports
EXPOSE 3009 3008
# Hardcode ports for runtime
ENV BACKEND_PORT=3009
ENV FRONTEND_PORT=3008
ENV PORT=3009
# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${BACKEND_PORT}/api/health || exit 1
# Run the server
CMD ["node", "server/index.js"]
