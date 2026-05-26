# Install dependencies and build
FROM node:20-alpine AS builder

# Mirror local repo structure: install inside /workspace/app so node_modules land
# at /workspace/app/node_modules — matching Prisma schema output path
WORKDIR /workspace/app
COPY app/package.json app/package-lock.json ./
RUN npm install --prefer-offline

# Copy source files, preserving repo layout
WORKDIR /workspace
COPY app/ ./app/
COPY prisma/ ./prisma/

# Build from within app/ — prisma generate finds schema at /workspace/app/prisma/,
# outputs client to /workspace/app/node_modules/.prisma/client ✓
# next build finds next.config.ts and tsconfig.json in /workspace/app/ ✓
WORKDIR /workspace/app
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /workspace/app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
COPY --from=builder /workspace/app/.next ./.next
COPY --from=builder /workspace/app/node_modules ./node_modules
COPY --from=builder /workspace/app/package.json ./package.json
COPY --from=builder /workspace/app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
