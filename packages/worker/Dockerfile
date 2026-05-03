FROM node:22-alpine AS builder

WORKDIR /app

COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN npm ci
RUN npm run build

WORKDIR /app
COPY packages/worker ./packages/worker
WORKDIR /app/packages/worker
RUN npm ci
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app/packages/shared

COPY --from=builder /app/packages/shared/package.json ./package.json
COPY --from=builder /app/packages/shared/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./dist

WORKDIR /app/packages/worker

COPY --from=builder /app/packages/worker/package.json ./package.json
COPY --from=builder /app/packages/worker/node_modules ./node_modules
COPY --from=builder /app/packages/worker/dist ./dist

CMD ["npm", "run", "start"]
