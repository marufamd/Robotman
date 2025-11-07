# Build image for services/api
FROM node:16-alpine3.15 AS builder

# Install build dependencies for native modules (if needed)
RUN apk add --no-cache python2 make g++

WORKDIR /usr/src/app

# Copy root manifests and the services directory so npm workspaces resolve local packages (eg. @robotman/types)
COPY package.json package-lock.json tsconfig.base.json ./
COPY services/ ./services/

# Remove problematic packages from bot's package.json to avoid building them
RUN sed -i '/"skia-canvas":/d' services/bot/package.json || true
RUN sed -i '/"@sapphire\/type":/d' services/bot/package.json || true

# Install all deps (workspace-aware) and build only the api workspace
RUN npm install --no-audit --prefer-offline
# Ensure shared types package is built first so workspace imports resolve
RUN cd services/types && npm run build && cd ../..
RUN cd services/api && npm run build && cd ../..

FROM node:16-alpine3.15 AS runtime
WORKDIR /usr/src/app

# Copy production deps and built code for api
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/services/api/dist ./dist
COPY --from=builder /usr/src/app/services/api/package.json ./package.json

# Copy shared types package so @robotman/types can be resolved
COPY --from=builder /usr/src/app/services/types ./services/types

ENV NODE_ENV=production

# Use non-root user
RUN addgroup -S robotman && adduser -S -G robotman robotman
USER robotman

# Default start for api (service expects dist/index.js as main)
CMD ["node", "dist/index.js"]
