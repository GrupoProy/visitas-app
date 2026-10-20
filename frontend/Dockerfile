# ==========================================================
# STAGE 1: Build del frontend con Vite
# ==========================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URL de la API (relativa, será proxeada por Nginx)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ==========================================================
# STAGE 2: Servir con Nginx
# ==========================================================
FROM nginx:alpine

# Configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]