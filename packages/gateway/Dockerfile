FROM node:22-alpine AS builder

WORKDIR /app

COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN npm ci
RUN npm run build

WORKDIR /app
COPY packages/gateway ./packages/gateway
WORKDIR /app/packages/gateway
RUN npm ci
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app/packages/shared

COPY --from=builder /app/packages/shared/package.json ./package.json
COPY --from=builder /app/packages/shared/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./dist

WORKDIR /app/packages/gateway

COPY --from=builder /app/packages/gateway/package.json ./package.json
COPY --from=builder /app/packages/gateway/node_modules ./node_modules
COPY --from=builder /app/packages/gateway/dist ./dist

CMD ["npm", "run", "start"]
