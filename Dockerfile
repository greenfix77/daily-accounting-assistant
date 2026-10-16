# ---------- حساب یار ری را — production image ----------
FROM oven/bun:1.2-slim

WORKDIR /app
ENV NODE_ENV=production

# openssl + CA certs for Prisma engines on debian slim
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# install dependencies first (better layer caching)
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# copy the rest of the source and build
COPY . .
RUN bunx prisma generate && bun run build

# persistent data directory (mount a Railway volume here)
ENV DATABASE_URL=file:/data/hesabyar.db
RUN mkdir -p /data

EXPOSE 3000

# create/update DB schema on the volume, then serve the standalone build
CMD ["sh", "-c", "bunx prisma db push --skip-generate && bun .next/standalone/server.js"]
