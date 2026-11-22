FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
FROM deps AS builder
COPY . .
RUN npm run build
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node","server.js"]
