FROM node:22-alpine AS builder

ARG DASHBOARD_API_BASE_URL
ARG DASHBOARD_DISCORD_OAUTH_URL

WORKDIR /app

COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN npm ci
RUN npm run build

WORKDIR /app
COPY packages/dashboard ./packages/dashboard
WORKDIR /app/packages/dashboard
ENV DASHBOARD_API_BASE_URL=${DASHBOARD_API_BASE_URL}
ENV DASHBOARD_DISCORD_OAUTH_URL=${DASHBOARD_DISCORD_OAUTH_URL}
RUN npm ci
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app/packages/shared

COPY --from=builder /app/packages/shared/package.json ./package.json
COPY --from=builder /app/packages/shared/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./dist

WORKDIR /app/packages/dashboard

COPY --from=builder /app/packages/dashboard/package.json ./package.json
COPY --from=builder /app/packages/dashboard/node_modules ./node_modules
COPY --from=builder /app/packages/dashboard/.output ./.output

EXPOSE 3000

CMD ["npm", "run", "start"]
