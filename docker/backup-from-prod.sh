#!/usr/bin/env bash
set -e

# Cargar variables de entorno desde .env si existe
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -E '^(DATABASE_URL|AIVEN_PG_URL)=' | xargs)
fi

PROD_URL="${AIVEN_PG_URL:-$DATABASE_URL}"

if [ -z "$PROD_URL" ]; then
  echo "❌ Error: No se encontró DATABASE_URL ni AIVEN_PG_URL en .env"
  exit 1
fi

BACKUP_FILE="$(dirname "$0")/backup_prod.sql"

echo "📥 Iniciando respaldo de PRODUCCIÓN de forma SEGURA (solo lectura)..."
docker run --rm postgres:alpine pg_dump \
  --no-owner \
  --no-privileges \
  "$PROD_URL" > "$BACKUP_FILE"

echo "✅ Respaldo guardado exitosamente en: $BACKUP_FILE"
echo "📊 Tamaño del respaldo: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
