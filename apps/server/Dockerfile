FROM node:22-alpine AS tooling
RUN npm install --global pnpm@11.11.0
WORKDIR /workspace

FROM tooling AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.7 prune @robotman/server --docker

FROM tooling AS builder
COPY --from=pruner /workspace/out/json/ ./
COPY --from=pruner /workspace/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /workspace/out/full/ ./
RUN pnpm exec turbo run build --filter=@robotman/server --cache-dir=.turbo/cache
RUN pnpm --filter=@robotman/server deploy --legacy --prod /runtime

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=builder --chown=node:node /runtime/ ./
USER node
EXPOSE 3001
HEALTHCHECK --interval=5s --timeout=4s --start-period=10s --retries=5 CMD node -e "fetch('http://127.0.0.1:3001/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'{ ready }'})}).then(r=>r.json()).then(r=>process.exit(r.data?.ready===true?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
