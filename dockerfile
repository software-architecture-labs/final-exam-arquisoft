# Etapa 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Etapa 2: Producción
FROM node:18-alpine

WORKDIR /app

# Crear directorio para la BD
RUN mkdir -p /app/data

# Copiar node_modules desde builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código fuente
COPY package*.json ./
COPY src ./src
COPY docs ./docs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Ejecutar aplicación
CMD ["npm", "start"]