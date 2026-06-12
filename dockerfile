# ─── Etapa 1: Builder ────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ─── Etapa 2: Producción ─────────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Directorios para BD y logs
RUN mkdir -p /app/data /app/logs

# Dependencias
COPY --from=builder /app/node_modules ./node_modules

# Código fuente
COPY package*.json ./
COPY src           ./src
COPY config        ./config
COPY controllers   ./controllers
COPY models        ./models
COPY routes        ./routes
COPY docs          ./docs
COPY frontend      ./frontend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
