#!/bin/sh
set -e

echo "⏳ Esperando a PostgreSQL en ${DB_HOST}:${DB_PORT}..."
node src/scripts/waitForDb.js

echo "👤 Verificando/creando usuario admin..."
node src/scripts/seedAdmin.js || echo "⚠️  seedAdmin: ya existe o falló (no crítico)"

echo "🚀 Iniciando backend en puerto ${PORT}..."
exec node src/server.js