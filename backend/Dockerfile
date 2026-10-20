# ==========================================================
# Backend — Node.js 20 Alpine
# ==========================================================
FROM node:20-alpine

WORKDIR /app

# Zona horaria
RUN apk add --no-cache tzdata
ENV TZ=America/La_Paz

# Copiar manifiestos primero (cache de capas)
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el resto del código
COPY . .

# Permisos al entrypoint
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]