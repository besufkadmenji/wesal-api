# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN npm install --global pnpm@11.15.0

WORKDIR /app

FROM base AS production-dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY nest-cli.json tsconfig.build.json tsconfig.json ./
COPY emails ./emails
COPY lib ./lib
COPY src ./src
RUN pnpm run build

FROM node:24-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_SYNCHRONIZE=false
ENV AUTO_SEED=false
ENV RUN_MIGRATIONS=true

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod 0755 ./docker-entrypoint.sh \
    && mkdir -p /var/data/uploads \
    && chown node:node /var/data/uploads

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail --silent --show-error "http://127.0.0.1:${PORT:-3000}/api" > /dev/null || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
