# ==========================================
# Stage 1: Build & Compile
# ==========================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install openssl for correct Prisma engine detection during build
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy Prisma schema and generate Prisma Client
COPY src/shared/db/schema.prisma ./src/shared/db/schema.prisma
RUN npx prisma generate

# Copy tsconfig and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript in /dist
RUN npm run build

# Copy static assets (SCOWL wordchain dictionaries and JSON assets) into dist
RUN if [ -d "src/features/wordchain/assets" ]; then \
      mkdir -p dist/features/wordchain/assets && \
      cp -r src/features/wordchain/assets/* dist/features/wordchain/assets/; \
    fi

# ==========================================
# Stage 2: Production Runner
# ==========================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install openssl (required by Prisma engine) and dumb-init (for proper PID 1 signal forwarding / Graceful Shutdown)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl dumb-init && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copy package specifications
COPY package*.json ./

# Copy complete node_modules from builder to preserve CLI scripts (tsx, prisma)
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Copy source code, scripts, and Prisma schema/migrations for CLI tools (deploy:prod, deploy:metadata)
COPY --from=builder /app/src ./src

# Copy entrypoint script and normalize line endings for Linux
COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Persistent directory for SQLite storage
RUN mkdir -p /app/data

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
