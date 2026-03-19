# ── Etapa 1: Instalar dependencias y compilar ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos SOLO archivos de dependencias primero.
# Docker cachea esta capa: si no cambian los package.json,
# no reinstala dependencias (ahorra minutos en cada build).
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --ignore-scripts && \
    cd apps/backend && npx --yes @nestjs/cli --version > /dev/null 2>&1 || true

# Ahora copiamos el código fuente
COPY apps/backend/ ./apps/backend/
COPY packages/shared/ ./packages/shared/

RUN cd apps/backend && npm run build

# ── Etapa 2: Imagen de producción (más ligera) ──
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Solo dependencias de producción (sin devDependencies)
RUN npm ci --omit=dev --ignore-scripts

# Copiamos SOLO el código compilado y los archivos públicos
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared ./packages/shared

# Carpeta public para archivos estáticos (imágenes, thumbnails, certificados)
COPY apps/backend/public ./apps/backend/public

WORKDIR /app/apps/backend

EXPOSE 3000
CMD ["node", "dist/main.js"]
