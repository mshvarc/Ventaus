FROM node:22.15.0-alpine

LABEL org.opencontainers.image.title="ANNITI SMART Aurora Gallery Preview"
LABEL org.opencontainers.image.description="Isolated preview runtime for the ANNITI SMART landing page"

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3086 \
    DIST_DIR=/app/dist \
    SUBMISSIONS_FILE=/var/lib/anniti-smart-preview/submissions/test-submissions.jsonl

WORKDIR /app

RUN mkdir -p /app/dist /app/server /var/lib/anniti-smart-preview/submissions \
    && chown -R node:node /app /var/lib/anniti-smart-preview

COPY --chown=node:node dist/ ./dist/
COPY --chown=node:node server/ ./server/

USER node

EXPOSE 3086

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=4 \
  CMD node -e "fetch('http://127.0.0.1:3086/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
