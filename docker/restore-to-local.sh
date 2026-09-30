#!/usr/bin/env bash
set -e

BACKUP_FILE="$(dirname "$0")/backup_prod.sql"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: No existe el archivo de respaldo en $BACKUP_FILE"
  echo "Ejecuta primero: ./docker/backup-from-prod.sh"
  exit 1
fi

CONTAINER_NAME="rgdev_flujo_efectivo_db"

# Verificar que el contenedor esté corriendo
if [ ! "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
  echo "⚠️ El contenedor $CONTAINER_NAME no está corriendo. Iniciándolo..."
  docker compose up -d db
  sleep 3
fi

echo "🔄 Restaurando base de datos local desde $BACKUP_FILE..."
docker exec -i "$CONTAINER_NAME" psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS flujo_efectivo WITH (FORCE);" -c "CREATE DATABASE flujo_efectivo;"
docker exec -i "$CONTAINER_NAME" psql -U postgres -d flujo_efectivo < "$BACKUP_FILE"

echo "✅ Base de datos local restaurada exitosamente con datos de producción."
echo "📊 Conteo de transacciones:"
docker exec -i "$CONTAINER_NAME" psql -U postgres -d flujo_efectivo -c "SELECT count(*) AS total_transacciones FROM transacciones;"
