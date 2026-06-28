# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:22-alpine AS base
WORKDIR /app
# libc compat for some native deps under Alpine.
RUN apk add --no-cache libc6-compat

# ---------- build ----------
FROM base AS build
COPY package.json package-lock.json ./
# --legacy-peer-deps: an optional @sveltejs/kit peer of better-auth pulls a
# vite 8 beta that conflicts with our vite 7 toolchain. We don't use Svelte.
RUN npm ci --legacy-peer-deps
COPY . .
# Env is validated at runtime (by scripts/docker-start.mjs / the app), not build.
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner ----------
# Reuses the build stage so the full dependency tree (incl. drizzle-kit for
# migrations) and the .next build are present. Startup waits for Postgres,
# ensures the database + schema, then runs `next start`.
FROM build AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "scripts/docker-deploy.mjs"]
