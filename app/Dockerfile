# Build stage
# Build context is nexxau/app/ (Railway root dir = /app)
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (cache layer)
COPY package.json package-lock.json ./
RUN npm install --prefer-offline

# Copy the rest of app source
COPY . .

# prisma generate + next build
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Alpine ships with no fonts at all. sharp renders the SVG overlay in
# /api/alerts/[id]/snapshot through librsvg, which silently draws nothing for <text>
# when fontconfig can't resolve a family — you get the bounding box and the label
# plate, but no label. DejaVu covers both the sans and mono families that route asks for.
# (font-dejavu is the modern package name; ttf-dejavu is the pre-3.15 alias. Try both
# rather than let a name change fail the whole build.)
RUN apk add --no-cache fontconfig \
 && (apk add --no-cache font-dejavu || apk add --no-cache ttf-dejavu) \
 && fc-cache -f \
 && fc-list | head

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
