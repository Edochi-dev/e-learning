#!/bin/bash
set -euo pipefail

# ============================================================
#  backup-files.sh — Respaldo de los archivos subidos
# ------------------------------------------------------------
#  pg_dump respalda la base de datos. Esto respalda lo OTRO:
#  los certificados emitidos, las plantillas, las fotos de
#  correcciones y las miniaturas. Sin esto, perder el disco no
#  solo se lleva los PDFs ya emitidos, sino también las
#  plantillas con las que podrían regenerarse — la base de
#  datos quedaría llena de registros irrecuperables.
#
#  Uso:
#    ./backup-files.sh          # manual o desde deploy.sh
#    (y desde cron, a diario — ver el README al final)
# ============================================================

# Se pueden sobrescribir por entorno para poder ejercitar el script contra un
# árbol de prueba. Sin ellas, los valores del servidor.
PROJECT_DIR="${PROJECT_DIR:-/home/cerberus/e-learning}"
SOURCE_DIR="$PROJECT_DIR/apps/backend/public"

# Fuera del proyecto A PROPÓSITO: un backup dentro del árbol que respalda
# desaparece con él si alguien borra el proyecto. Mismo disco, eso sí, que es
# lo que permite los hardlinks (ver más abajo) — y también su límite: esto NO
# protege contra el fallo del disco. Para eso hace falta una copia externa.
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups-marisnails/files}"

KEEP=10

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEST="$BACKUP_ROOT/$TIMESTAMP"
LATEST="$BACKUP_ROOT/latest"

echo "============================================"
echo "  BACKUP DE ARCHIVOS"
echo "============================================"
echo "  Origen:  $SOURCE_DIR"
echo "  Destino: $DEST"

# ── Guardarraíl: nunca respaldar la nada ───────────────────────────────
#
# Este es el modo clásico en que un sistema de backups se convierte en un
# generador de copias vacías: el origen desaparece (disco desmontado, ruta
# cambiada, deploy a medias), se respalda un directorio vacío y la rotación
# va borrando las copias buenas hasta que no queda ninguna. El día que hace
# falta restaurar, hay diez copias y todas están vacías.
#
# Por eso: si el origen no existe o no tiene archivos, se aborta ANTES de
# tocar nada. Es el mismo criterio que ya aplica deploy.sh con un pg_dump
# vacío.
if [ ! -d "$SOURCE_DIR" ]; then
    echo "ERROR: el origen no existe. Abortando sin tocar los backups."
    exit 1
fi

SOURCE_COUNT=$(find "$SOURCE_DIR" -type f | wc -l)
if [ "$SOURCE_COUNT" -eq 0 ]; then
    echo "ERROR: el origen está vacío. Abortando sin tocar los backups."
    exit 1
fi

echo "  Archivos en el origen: $SOURCE_COUNT"

mkdir -p "$BACKUP_ROOT"

# ── Snapshot con deduplicación ─────────────────────────────────────────
#
# --link-dest hace que los archivos idénticos al backup anterior no se
# copien: se crean como hardlinks al mismo dato en disco. Cada snapshot se
# ve y se restaura como una copia completa, pero solo ocupa lo que cambió.
# Encaja con estos datos porque un certificado emitido nunca se modifica.
#
# --delete mantiene el espejo fiel: lo borrado en origen desaparece del
# snapshot nuevo, mientras los anteriores lo conservan.
LINK_DEST=()
if [ -d "$LATEST" ]; then
    LINK_DEST=(--link-dest "$LATEST")
fi

rsync -a --delete "${LINK_DEST[@]}" "$SOURCE_DIR/" "$DEST/"

# ── Verificar la copia antes de darla por buena ────────────────────────
DEST_COUNT=$(find "$DEST" -type f | wc -l)
if [ "$DEST_COUNT" -ne "$SOURCE_COUNT" ]; then
    echo "ERROR: la copia tiene $DEST_COUNT archivos y el origen $SOURCE_COUNT."
    echo "       Se conserva el directorio para inspección y NO se rota nada."
    exit 1
fi

# `latest` apunta al último snapshot bueno: es el --link-dest de la próxima
# ejecución, así que solo se mueve cuando la copia está verificada.
ln -sfn "$DEST" "$LATEST"

BACKUP_SIZE=$(du -sh "$DEST" | cut -f1)
echo "  Copia verificada: $DEST_COUNT archivos ($BACKUP_SIZE aparentes)"

# ── Rotación ───────────────────────────────────────────────────────────
# Se borran los snapshots más antiguos. Gracias a los hardlinks, borrar uno
# no afecta a los demás: el dato en disco sobrevive mientras quede algún
# snapshot que lo enlace.
mapfile -t SNAPSHOTS < <(find "$BACKUP_ROOT" -maxdepth 1 -type d -name '20*' | sort -r)
if [ "${#SNAPSHOTS[@]}" -gt "$KEEP" ]; then
    for old in "${SNAPSHOTS[@]:$KEEP}"; do
        echo "  Eliminando snapshot antiguo: $(basename "$old")"
        rm -rf "$old"
    done
fi

# Se mide DESPUÉS de rotar: antes reportaría el espacio que ya se liberó.
TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" | cut -f1)
echo "  Snapshots conservados: $(find "$BACKUP_ROOT" -maxdepth 1 -type d -name '20*' | wc -l) (ocupan $TOTAL_SIZE en total)"
echo "  Restaurar:  cp -a $LATEST/. $SOURCE_DIR/"

# ── Copia fuera del servidor (opcional) ────────────────────────────────
#
# Todo lo anterior vive en el mismo disco que los originales: protege de un
# borrado accidental, NO de que el disco falle. Esto es lo que cierra ese
# hueco.
#
# Se activa definiendo RCLONE_REMOTE con un remoto ya configurado
# (`rclone config`), por ejemplo: RCLONE_REMOTE="gdrive:marisnails-backup"
# Si no está definido, el script termina aquí sin dar error: la copia local
# ya se hizo y no tiene sentido fallar por algo opcional.
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

if [ -z "$RCLONE_REMOTE" ]; then
    echo "  (Sin copia externa: RCLONE_REMOTE no está definido)"
    echo "============================================"
    exit 0
fi

if ! command -v rclone >/dev/null 2>&1; then
    echo "  AVISO: RCLONE_REMOTE está definido pero rclone no está instalado."
    echo "         La copia local SÍ se hizo. Revisa la copia externa."
    exit 0
fi

echo "  Subiendo a $RCLONE_REMOTE ..."

# --progress redibuja una línea en bucle con secuencias de terminal: útil a
# mano, kilobytes de basura dentro del log del cron.
PROGRESS=()
if [ -t 1 ]; then
    PROGRESS=(--progress)
fi

# `copy`, NO `sync`, y es deliberado: sync replica los borrados, así que un
# origen vacío o corrupto arrasaría también la copia remota — justo el
# escenario del que este backup debería protegernos. `copy` solo añade: lo
# que llegó al remoto se queda. Encaja con estos datos, donde un certificado
# emitido no se modifica ni debería desaparecer.
#
# Se sube el último snapshot, no todos: Google Drive no tiene hardlinks, así
# que subir los diez multiplicaría el espacio por diez sin aportar nada.
#
# El fallo se atrapa a mano en vez de dejarlo a `set -e`: así el script muere
# gritando por qué y no cortando el log a media línea, que en un sistema de
# respaldo es la diferencia entre enterarse y no enterarse.
if ! rclone copy "$LATEST/" "$RCLONE_REMOTE/" \
        "${PROGRESS[@]}" --stats-one-line --retries 3; then
    echo ""
    echo "  ERROR: la copia externa a $RCLONE_REMOTE FALLÓ."
    echo "         La copia LOCAL sí quedó hecha y verificada en:"
    echo "           $DEST"
    echo "         Pero hoy NO existe copia fuera de este disco."
    echo "============================================"
    exit 3
fi

echo "  Copia externa completada."
echo "============================================"
