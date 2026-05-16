# Install dependencies and build
FROM node:20-alpine AS builder
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN apk add --no-cache python3 py3-pip make g++ linux-headers
RUN npm install --prefer-offline
COPY app/ ./app/
COPY prisma/ ./prisma/
COPY src/ ./src/
COPY tsconfig.json next.config.js next.config.ts ./
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
CMD ["npm", "run", "start"] 