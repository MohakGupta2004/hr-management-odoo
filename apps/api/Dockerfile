FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the source and generate the Prisma client.
# DATABASE_URL is only needed so prisma.config.ts resolves; a placeholder is fine
# for `generate` (the real URL is injected at runtime by compose).
COPY . .
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" bunx prisma generate

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
