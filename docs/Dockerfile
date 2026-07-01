# syntax=docker/dockerfile:1

# Docs site (Next.js + Nextra). Built and run as its own container, reached by the
# web app's /docs rewrite over the compose network. Serves under basePath "/docs".

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner ----------
FROM build AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3040
ENV HOSTNAME=0.0.0.0
EXPOSE 3040
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3040"]
