#!/bin/bash
set -euo pipefail

# ============================================================
#  backup-files.sh — Respaldo de los archivos subidos
# ------------------------------------------------------------
#  pg_dump respalda la base de datos. Esto respalda lo OTRO:
#  - public/:  certificados emitidos, plantillas, fotos de
#              correcciones y miniaturas. Sin las plantillas, la
#              base de datos quedaría llena de registros
#              irrecuperables.
#  - storage/: archivos privados que nunca se sirven como
#              estáticos (audios de corrección, originales de video).
#
#  Uso:
#    ./backup-files.sh          # manual o desde deploy.sh
#    (y desde cron, a diario)
# ============================================================

PROJECT_DIR="${PROJECT_DIR:-/home/cerberus/e-learning}"
BACKEND_DIR="$PROJECT_DIR/apps/backend"

# Fuera del proyecto A PROPÓSITO: un backup dentro del árbol que respalda
# desaparece con él si alguien borra el proyecto. Mismo disco, eso sí, que es
# lo que permite los hardlinks — y también su límite: esto NO protege contra
# el fallo del disco. Para eso hace falta una copia externa.
BACKUP_BASE="${BACKUP_BASE:-$HOME/backups-marisnails}"

KEEP=10
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

count_files() {
    local dir=$1; shift
    local prune=()
    for excluded in "$@"; do
        prune+=(-path "$dir/$excluded" -prune -o)
    done
    find "$dir" "${prune[@]}" -type f -print | wc -l
}

# snapshot <origen> <raíz de backups> <required|optional> [carpeta excluida...]
#
# "optional" existe para storage/: no tener archivos todavía es legítimo
# (nadie ha grabado un audio), así que vacío solo es error si ya hubo copias.
snapshot() {
    local source=$1 root=$2 mode=$3; shift 3
    local excludes=("$@")
    local dest="$root/$TIMESTAMP" latest="$root/latest"

    echo "  Origen:  $source"
    echo "  Destino: $dest"

    # Guardarraíl: respaldar un origen vacío y luego rotar acaba dejando N
    # copias vacías. Se aborta ANTES de tocar nada, igual que deploy.sh con un
    # pg_dump vacío.
    local source_count=0
    [ -d "$source" ] && source_count=$(count_files "$source" "${excludes[@]}")
    if [ "$source_count" -eq 0 ]; then
        if [ "$mode" = "optional" ] && [ ! -e "$latest" ]; then
            echo "  (Sin archivos todavía: nada que respaldar)"
            return 0
        fi
        echo "ERROR: el origen no existe o está vacío. Abortando sin tocar los backups."
        exit 1
    fi
    echo "  Archivos en el origen: $source_count"

    mkdir -p "$root"

    # --link-dest: lo que no cambió desde el snapshot anterior se enlaza en vez
    # de copiarse. Cada snapshot se restaura como copia completa pero solo ocupa
    # lo que cambió. --delete mantiene el espejo fiel; los snapshots anteriores
    # conservan lo borrado.
    local rsync_args=(-a --delete)
    [ -d "$latest" ] && rsync_args+=(--link-dest "$latest")
    for excluded in "${excludes[@]}"; do
        rsync_args+=(--exclude "/$excluded/")
    done

    rsync "${rsync_args[@]}" "$source/" "$dest/"

    local dest_count
    dest_count=$(find "$dest" -type f | wc -l)
    if [ "$dest_count" -ne "$source_count" ]; then
        echo "ERROR: la copia tiene $dest_count archivos y el origen $source_count."
        echo "       Se conserva el directorio para inspección y NO se rota nada."
        exit 1
    fi

    # `latest` es el --link-dest de la próxima ejecución: solo se mueve cuando
    # la copia está verificada.
    ln -sfn "$dest" "$latest"
    echo "  Copia verificada: $dest_count archivos ($(du -sh "$dest" | cut -f1) aparentes)"

    # Gracias a los hardlinks, borrar un snapshot no afecta a los demás.
    local snapshots
    mapfile -t snapshots < <(find "$root" -maxdepth 1 -type d -name '20*' | sort -r)
    if [ "${#snapshots[@]}" -gt "$KEEP" ]; then
        for old in "${snapshots[@]:$KEEP}"; do
            echo "  Eliminando snapshot antiguo: $(basename "$old")"
            rm -rf "$old"
        done
    fi

    echo "  Snapshots conservados: $(find "$root" -maxdepth 1 -type d -name '20*' | wc -l) (ocupan $(du -sh "$root" | cut -f1) en total)"
    echo "  Restaurar:  cp -a $latest/. $source/"
}

echo "============================================"
echo "  BACKUP DE ARCHIVOS"
echo "============================================"
echo "--- public/ ---"
snapshot "$BACKEND_DIR/public" "$BACKUP_BASE/files" required

echo "--- storage/ ---"
# hls/ queda fuera: se regenera desde video-sources/, que sí se respalda y
# que el pipeline nunca borra. Copiarlo duplicaría el espacio de cada video.
snapshot "$BACKEND_DIR/storage" "$BACKUP_BASE/storage" optional hls

# ── Copia fuera del servidor (opcional) ────────────────────────────────
#
# Todo lo anterior vive en el mismo disco que los originales: protege de un
# borrado accidental, NO de que el disco falle.
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

# `copy`, NO `sync`: sync replica los borrados, así que un origen vacío o
# corrupto arrasaría también la copia remota. Se sube solo el último snapshot
# porque Google Drive no tiene hardlinks.
for name in files storage; do
    latest="$BACKUP_BASE/$name/latest"
    [ -e "$latest" ] || continue
    echo "  Subiendo $name a $RCLONE_REMOTE/$name ..."
    rclone copy "$latest/" "$RCLONE_REMOTE/$name/" --progress --stats-one-line
done

echo "  Copia externa completada."
echo "============================================"
