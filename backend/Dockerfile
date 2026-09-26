FROM node:22-alpine AS build
# argon2 needs a compiler on alpine.
RUN apk add --no-cache python3 make g++
WORKDIR /app

# Install backend deps first for better layer caching.
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Prisma schema lives outside backend/; copy it where prisma.config.ts expects it:
# backend/prisma.config.ts -> ../database/schema.prisma -> /app/database/schema.prisma
COPY database ./database
COPY backend ./backend
WORKDIR /app/backend
RUN npm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
# argon2 native binding needs libstdc++ at runtime.
RUN apk add --no-cache libstdc++
WORKDIR /app/backend
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/package*.json ./
COPY --from=build /app/backend/prisma.config.ts ./
COPY --from=build /app/database ../database
EXPOSE 3001
# Railway/Render inject PORT. Migrate on boot so first deploy creates tables.
CMD ["sh", "-c", "npm run db:migrate && node dist/src/main.js"]


