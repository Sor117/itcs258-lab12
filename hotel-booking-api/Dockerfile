# Build stage: install all dependencies, generate the Prisma client, compile TypeScript.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
# Prisma detects the OpenSSL version to pick its query engine; the slim image has none.
# My network drops requests with apt's own User-Agent ("Debian APT-HTTP"), so set a different one
# in apt.conf (an -o flag on "apt-get update" alone doesn't reach "apt-get install").
RUN echo 'Acquire::http::User-Agent "Mozilla/5.0";' > /etc/apt/apt.conf.d/99-user-agent \
    && apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
# The postinstall "prisma generate" ran before the schema existed, so generate now.
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# One-shot migration job for Compose. It still has the Prisma CLI (a devDependency).
FROM build AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

# Drop devDependencies but keep the generated client in node_modules/.prisma.
FROM build AS prod-deps
RUN npm prune --omit=dev

# Runtime stage: production node_modules (with the Prisma client) and compiled JavaScript only.
FROM node:24-bookworm-slim AS runtime
RUN echo 'Acquire::http::User-Agent "Mozilla/5.0";' > /etc/apt/apt.conf.d/99-user-agent \
    && apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=prod-deps --chown=node:node /app/package*.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/prisma ./prisma
COPY --from=prod-deps --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
