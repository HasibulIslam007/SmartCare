FROM node:22-alpine AS build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
# BACKEND_URL is server-side (proxy route.ts); APP_ORIGIN guards POST origin.
# Both read at request time, but Next inlines them at build, so pass as build args.
ARG BACKEND_URL=http://127.0.0.1:3001
ARG APP_ORIGIN=http://127.0.0.1:3000
ENV BACKEND_URL=$BACKEND_URL APP_ORIGIN=$APP_ORIGIN
RUN npm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app/frontend
COPY --from=build /app/frontend/node_modules ./node_modules
COPY --from=build /app/frontend/package*.json ./
COPY --from=build /app/frontend/.next ./.next
COPY --from=build /app/frontend/next.config.ts ./
EXPOSE 3000
CMD ["sh", "-c", "npx next start --hostname 0.0.0.0 --port ${PORT:-3000}"]

