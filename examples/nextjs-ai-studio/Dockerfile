FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY}

FROM base AS deps
COPY package.json yarn.lock ./
RUN corepack enable \
  && npm config set registry ${NPM_REGISTRY} \
  && yarn config set npmRegistryServer ${NPM_REGISTRY} \
  && yarn config set nodeLinker node-modules \
  && yarn install --immutable

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable \
  && npm config set registry ${NPM_REGISTRY} \
  && yarn config set npmRegistryServer ${NPM_REGISTRY} \
  && yarn build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
