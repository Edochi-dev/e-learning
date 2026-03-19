#!/bin/bash
set -e

# ============================================================
#  deploy.sh — Deploy con backup automático de PostgreSQL
# ============================================================
#  Cada vez que haces deploy, primero se crea un backup .sql
#  de la base de datos. Si algo sale mal (una migración rompe
#  datos, por ejemplo), puedes restaurar con:
#
#    psql -h localhost -p 5432 -U marisnails -d marisnails_db < backups/archivo.sql
# ============================================================

PROJECT_DIR="/home/cerberus/e-learning"
BACKUP_DIR="$PROJECT_DIR/backups"
ENV_FILE="$PROJECT_DIR/apps/backend/.env"

# --- Leer variables de la DB desde el .env del backend ---
DB_HOST=$(grep -E '^DB_HOST=' "$ENV_FILE" | cut -d '=' -f2)
DB_PORT=$(grep -E '^DB_PORT=' "$ENV_FILE" | cut -d '=' -f2)
DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | cut -d '=' -f2)
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | cut -d '=' -f2)
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2)

# --- Crear directorio de backups si no existe ---
mkdir -p "$BACKUP_DIR"

# ============================================================
#  PASO 1: Backup de la base de datos
# ============================================================
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

echo "============================================"
echo "  BACKUP: Creando respaldo de la base de datos..."
echo "============================================"
echo "  Archivo: $BACKUP_FILE"

docker exec mn_postgres pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    > "$BACKUP_FILE"

# Verificar que el backup no esté vacío
if [ ! -s "$BACKUP_FILE" ]; then
    echo "ERROR: El backup está vacío. Abortando deploy."
    rm -f "$BACKUP_FILE"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "  Backup completado ($BACKUP_SIZE)"
echo ""

# --- Limpiar backups antiguos (conservar los últimos 10) ---
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.sql 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo "  Limpiando backups antiguos (conservando los 10 más recientes)..."
    ls -1t "$BACKUP_DIR"/backup_*.sql | tail -n +11 | xargs rm -f
fi

# ============================================================
#  PASO 2: Pull de cambios
# ============================================================
cd "$PROJECT_DIR"
echo "============================================"
echo "  GIT: Pulling changes..."
echo "============================================"
git pull origin main
echo ""

# ============================================================
#  PASO 3: Build del frontend
# ============================================================
echo "============================================"
echo "  FRONTEND: Building..."
echo "============================================"
cd "$PROJECT_DIR/apps/frontend"
npm install
npm run build
echo ""

# ============================================================
#  PASO 4: Build del backend
# ============================================================
echo "============================================"
echo "  BACKEND: Building..."
echo "============================================"
cd "$PROJECT_DIR/apps/backend"
npm install
npm run build
echo ""

# ============================================================
#  PASO 5: Reiniciar el backend
# ============================================================
echo "============================================"
echo "  PM2: Restarting marisnails-api..."
echo "============================================"
pm2 restart marisnails-api
echo ""

# ============================================================
#  RESULTADO
# ============================================================
echo "============================================"
echo "  Deploy complete!"
echo "  Backup guardado en: $BACKUP_FILE"
echo ""
echo "  Si algo salió mal, restaura con:"
echo "    docker exec -i mn_postgres psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
echo "============================================"
