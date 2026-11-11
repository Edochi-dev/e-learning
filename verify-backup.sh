#!/bin/bash
set -euo pipefail

# ============================================================
#  verify-backup.sh — Comprobar que el respaldo sirve
# ------------------------------------------------------------
#  backup-files.sh cuenta archivos. Contar demuestra que hay
#  751 cosas, no que esas cosas sean los certificados. Esto
#  compara BYTE A BYTE cada snapshot (public/ y storage/)
#  contra el original, y la copia externa por hash.
#
#  Uso:
#    ./verify-backup.sh          # compara TODOS los archivos
#    ./verify-backup.sh 25       # muestra aleatoria de 25 por carpeta
#
#  Salida: 0 todo bien · 1 hay diferencias · 2 no se pudo verificar
#  (si hay de ambas, gana 1: un respaldo corrupto es lo más grave)
# ============================================================

# Mismos valores por defecto y mismos overrides que backup-files.sh.
PROJECT_DIR="${PROJECT_DIR:-/home/cerberus/e-learning}"
BACKEND_DIR="$PROJECT_DIR/apps/backend"
BACKUP_BASE="${BACKUP_BASE:-$HOME/backups-marisnails}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
SAMPLE="${1:-0}"

if ! [[ "$SAMPLE" =~ ^[0-9]+$ ]]; then
    echo "Uso: $0 [tamaño de la muestra]"
    exit 2
fi

# comm exige exactamente el orden de sort; se fija para no depender del locale.
export LC_ALL=C

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

HAY_DIFERENCIAS=0
NO_VERIFICABLE=0

# list_files <dir> [carpeta excluida...] — rutas relativas, ordenadas.
list_files() {
    local dir=$1; shift
    local prune=()
    for excluded in "$@"; do
        prune+=(-path "./$excluded" -prune -o)
    done
    (cd "$dir" && find . "${prune[@]}" -type f -print | sort)
}

# verify_tree <nombre> <origen> <required|optional> [carpeta excluida...]
#
# <nombre> es a la vez la subcarpeta en BACKUP_BASE y en el remoto, igual que
# en backup-files.sh. Las exclusiones deben coincidir con las de ese script.
verify_tree() {
    local name=$1 source=$2 mode=$3; shift 3
    local excludes=("$@")
    local latest="$BACKUP_BASE/$name/latest"
    local work="$WORK/$name"
    mkdir -p "$work"

    echo ""
    echo "--- $name ---"
    echo "  Original: $source"
    echo "  Snapshot: $latest -> $(readlink -f "$latest" 2>/dev/null || echo '(sin resolver)')"

    if [ ! -d "$latest" ] && [ "$mode" = "optional" ]; then
        if [ -d "$source" ] && [ -n "$(list_files "$source" "${excludes[@]}" | head -n 1)" ]; then
            echo "  ERROR: hay archivos en el original y ningún snapshot. ¿Se ejecutó backup-files.sh?"
            NO_VERIFICABLE=1
        else
            echo "  (Sin archivos ni snapshot todavía: nada que verificar)"
        fi
        return 0
    fi

    if [ ! -d "$source" ]; then
        echo "  ERROR: el original no existe. Nada que comparar."
        NO_VERIFICABLE=1
        return 0
    fi

    if [ ! -d "$latest" ]; then
        echo "  ERROR: no hay snapshot 'latest'. ¿Se ejecutó backup-files.sh?"
        NO_VERIFICABLE=1
        return 0
    fi

    list_files "$source" "${excludes[@]}" > "$work/origen.txt"
    list_files "$latest" > "$work/copia.txt"

    # Solo uno de los tres conjuntos es un problema. Nuevos en el original son
    # los emitidos desde el último respaldo; los que solo tiene el snapshot son
    # justamente lo que el respaldo conserva. Pero estos datos se escriben una
    # vez y no se tocan: un archivo en ambos con contenido distinto es corrupción.
    comm -23 "$work/origen.txt" "$work/copia.txt" > "$work/solo-origen.txt"
    comm -13 "$work/origen.txt" "$work/copia.txt" > "$work/solo-copia.txt"
    comm -12 "$work/origen.txt" "$work/copia.txt" > "$work/comunes.txt"

    local nuevos borrados comunes
    nuevos=$(wc -l < "$work/solo-origen.txt")
    borrados=$(wc -l < "$work/solo-copia.txt")
    comunes=$(wc -l < "$work/comunes.txt")

    echo "  En ambos:                 $comunes"
    echo "  Nuevos desde el backup:   $nuevos  (se respaldarán en la próxima corrida)"
    echo "  Borrados desde el backup: $borrados  (el snapshot los conserva)"

    if [ "$comunes" -eq 0 ]; then
        echo "  ERROR: no hay ni un archivo en común. El snapshot no corresponde"
        echo "         a este origen, o está vacío."
        NO_VERIFICABLE=1
        return 0
    fi

    if [ "$SAMPLE" -gt 0 ] && [ "$SAMPLE" -lt "$comunes" ]; then
        shuf -n "$SAMPLE" "$work/comunes.txt" > "$work/a-comparar.txt"
        echo "  Comparando una muestra aleatoria de $SAMPLE archivos..."
    else
        cp "$work/comunes.txt" "$work/a-comparar.txt"
        echo "  Comparando los $comunes archivos, byte a byte..."
    fi

    local distintos=0 comparten_inodo=0 ok=0 rel src bak
    while IFS= read -r rel; do
        src="$source/${rel#./}"
        bak="$latest/${rel#./}"

        if ! cmp -s "$src" "$bak"; then
            echo "    DIFERENTE: $rel"
            distintos=$((distintos + 1))
            continue
        fi

        # Los hardlinks de --link-dest apuntan al snapshot ANTERIOR, nunca al
        # original. Compartir inodo con el original sería un solo dato con dos
        # nombres: corromper uno corrompe el otro. Se compara dispositivo:inodo
        # porque el número de inodo solo es único dentro de un mismo disco.
        if [ "$(stat -c '%d:%i' "$src")" = "$(stat -c '%d:%i' "$bak")" ]; then
            echo "    MISMO INODO (no es una copia real): $rel"
            comparten_inodo=$((comparten_inodo + 1))
            continue
        fi

        ok=$((ok + 1))
    done < "$work/a-comparar.txt"

    echo "  Idénticos y con dato propio: $ok"
    if [ "$distintos" -gt 0 ]; then
        echo "  Con contenido distinto:      $distintos"
        HAY_DIFERENCIAS=1
    fi
    if [ "$comparten_inodo" -gt 0 ]; then
        echo "  Sin dato propio:             $comparten_inodo"
        HAY_DIFERENCIAS=1
    fi

    verify_remote "$name" "$latest"
}

# Lo de arriba compara dos rutas del MISMO disco; si ese disco muere se van
# las dos. La copia que sobrevive es la remota, y `rclone check` la compara
# por hash, no por fecha ni tamaño.
verify_remote() {
    local name=$1 latest=$2

    if [ -z "$RCLONE_REMOTE" ]; then
        echo "  (Copia externa no verificada: RCLONE_REMOTE no está definido)"
        return 0
    fi

    if ! command -v rclone >/dev/null 2>&1; then
        echo "  ERROR: RCLONE_REMOTE definido pero rclone no está instalado."
        NO_VERIFICABLE=1
        return 0
    fi

    echo "  Verificando la copia externa en $RCLONE_REMOTE/$name (por hash)..."
    # --one-way: al remoto le sobran archivos a propósito (se sube con `copy`,
    # que nunca borra). Lo que importa es que no le FALTE ninguno.
    if rclone check "$latest/" "$RCLONE_REMOTE/$name/" --one-way; then
        echo "  Copia externa íntegra."
    else
        echo "  ERROR: la copia externa no coincide con el snapshot."
        HAY_DIFERENCIAS=1
    fi
}

echo "============================================"
echo "  VERIFICACIÓN DEL RESPALDO"
echo "============================================"

verify_tree files "$BACKEND_DIR/public" required
verify_tree storage "$BACKEND_DIR/storage" optional hls

echo ""
echo "============================================"
if [ "$HAY_DIFERENCIAS" -ne 0 ]; then
    echo "  RESULTADO: HAY DIFERENCIAS. Revisar antes de confiar en este respaldo."
    echo "============================================"
    exit 1
fi
if [ "$NO_VERIFICABLE" -ne 0 ]; then
    echo "  RESULTADO: NO SE PUDO VERIFICAR el respaldo (ver los ERROR de arriba)."
    echo "============================================"
    exit 2
fi
echo "  RESULTADO: el respaldo restaura correctamente."
echo "============================================"
