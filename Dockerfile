FROM oven/bun:1.3.0

WORKDIR /app

# Client bundle: Vite inlines `import.meta.env.VITE_*` at build time.
ARG VITE_APP_URL
ARG VITE_CONVEX_URL
ARG VITE_CONVEX_SITE_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_CONVEX_SITE_URL=$VITE_CONVEX_SITE_URL

COPY package.json bun.lock tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
COPY convex ./convex

RUN bun install --frozen-lockfile
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Respect Dokploy / platform `PORT`; default 3000.
CMD ["sh", "-c", "exec bun run preview -- --host 0.0.0.0 --port \"${PORT}\""]
