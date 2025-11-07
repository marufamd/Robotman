# Build image for services/bot
FROM node:16-alpine3.15 AS builder

# Install build dependencies for native modules (canvas, skia-canvas, etc.)
RUN apk add --no-cache \
  python2 make g++ pkgconfig \
  cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev pixman-dev

WORKDIR /usr/src/app

# Copy root manifests and the services directory so npm workspaces resolve local packages (eg. @robotman/types)
COPY package.json package-lock.json tsconfig.base.json ./
COPY services/ ./services/

# Remove skia-canvas and @sapphire/type from package.json to install prebuilt versions instead
RUN sed -i '/"skia-canvas":/d' services/bot/package.json

# Install all deps (workspace-aware)
RUN npm install --no-audit --prefer-offline
# Download and install prebuilt skia-canvas for Linux (AWS compatibility)
RUN wget -O /tmp/skia-canvas.tar.gz https://github.com/samizdatco/skia-canvas/releases/download/v0.9.28/skia-canvas-v0.9.28-linux-arm64-glibc.tar.gz \
  && cd services/bot && npm install /tmp/skia-canvas.tar.gz && cd ../.. \
  && rm /tmp/skia-canvas.tar.gz

# Ensure shared types package is built first so workspace imports resolve
RUN cd services/types && npm run build && cd ../..
RUN cd services/bot && npm run build && cd ../..

FROM node:16-alpine3.15 AS runtime

# Install runtime dependencies for canvas/skia
RUN apk add --no-cache \
  cairo pango jpeg giflib librsvg pixman \
  gcompat libstdc++

WORKDIR /usr/src/app

# Copy production deps and built code for bot
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/services/bot/node_modules ./node_modules
COPY --from=builder /usr/src/app/services/bot/dist ./dist
COPY --from=builder /usr/src/app/services/bot/package.json ./package.json

# copy assets used at runtime
COPY --from=builder /usr/src/app/services/bot/images ./images
COPY --from=builder /usr/src/app/services/bot/fonts ./fonts

COPY --from=builder /usr/src/app/services/types ./services/types

ENV NODE_ENV=production

# Use non-root user
RUN addgroup -S robotman && adduser -S -G robotman robotman
USER robotman

# Default start for bot
CMD ["node", "dist/index.js"]
