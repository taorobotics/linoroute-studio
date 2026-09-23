FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src

ENV HOST=0.0.0.0
ENV PORT=8787
EXPOSE 8787
CMD ["node", "src/server.mjs"]
