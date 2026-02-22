# Camera Ingest Service Dockerfile
FROM node:20-alpine AS base

# Install FFmpeg (required for video processing)
RUN apk add --no-cache ffmpeg

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

FROM base AS builder

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

FROM base AS runtime

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create /tmp/frames directory with proper permissions
RUN mkdir -p /tmp/frames && chown nodejs:nodejs /tmp/frames

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]