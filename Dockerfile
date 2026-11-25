FROM node:24-slim AS build
RUN npm install --global pnpm@11
WORKDIR /repo
COPY apps/api/package.json apps/api/pnpm-lock.yaml apps/api/pnpm-workspace.yaml apps/api/
RUN pnpm --dir apps/api install --frozen-lockfile
COPY apps/client/package.json apps/client/pnpm-lock.yaml apps/client/pnpm-workspace.yaml apps/client/
COPY apps/client/patches apps/client/patches
RUN pnpm --dir apps/client install --frozen-lockfile
COPY apps/api apps/api
COPY apps/client apps/client
RUN pnpm --dir apps/api run build
RUN pnpm --dir apps/client run build

FROM node:24-slim
WORKDIR /app
COPY --from=build /repo/apps/api/dist/server.mjs ./server.mjs
COPY --from=build /repo/apps/client/dist ./web
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    WEB_DIR=/app/web
RUN mkdir /data && chown node:node /data
VOLUME /data
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/config').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.mjs"]
