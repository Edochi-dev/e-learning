#!/bin/bash
set -euo pipefail

# ============================================================
#  verify-backup.sh — Comprobar que el respaldo sirve
# ------------------------------------------------------------
#  backup-files.sh cuenta archivos. Contar demuestra que hay
#  751 cosas, no que esas cosas sean los certificados. Esto
#  compara BYTE A BYTE el snapshot contra el original.
#
#  Un respaldo cuya restauración nunca se probó no es un
#  respaldo: es una suposición con nombre de archivo.
#
#  Uso:
#    ./verify-backup.sh          # compara TODOS los archivos
#    ./verify-backup.sh 25       # muestra aleatoria de 25
#
#  Salida: 0 todo bien · 1 hay diferencias · 2 no se pudo verificar
# ============================================================

PROJECT_DIR="${PROJECT_DIR:-/home/cerberus/e-learning}"
SOURCE_DIR="$PROJECT_DIR/apps/backend/public"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups-marisnails/files}"
LATEST="$BACKUP_ROOT/latest"
SAMPLE="${1:-0}"

echo "============================================"
echo "  VERIFICACIÓN DEL RESPALDO"
echo "============================================"
echo "  Original: $SOURCE_DIR"
echo "  Snapshot: $LATEST -> $(readlink -f "$LATEST" 2>/dev/null || echo '(sin resolver)')"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "  ERROR: el original no existe. Nada que comparar."
    exit 2
fi

if [ ! -d "$LATEST" ]; then
    echo "  ERROR: no hay snapshot 'latest'. ¿Se ejecutó backup-files.sh?"
    exit 2
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

(cd "$SOURCE_DIR" && find . -type f | sort) > "$WORK/origen.txt"
(cd "$LATEST" && find . -type f | sort) > "$WORK/copia.txt"

# Tres conjuntos, y solo uno de ellos es un problema.
#
# Que el original tenga archivos que el snapshot no: normal. Son los
# certificados emitidos desde el último respaldo. Que el snapshot tenga
# archivos que el original ya no: también normal, es justamente para lo que
# sirve. Lo que NO puede pasar es que un archivo esté en los dos con
# contenido distinto: estos datos se escriben una vez y no se vuelven a
# tocar, así que una diferencia ahí significa corrupción.
comm -23 "$WORK/origen.txt" "$WORK/copia.txt" > "$WORK/solo-origen.txt"
comm -13 "$WORK/origen.txt" "$WORK/copia.txt" > "$WORK/solo-copia.txt"
comm -12 "$WORK/origen.txt" "$WORK/copia.txt" > "$WORK/comunes.txt"

NUEVOS=$(wc -l < "$WORK/solo-origen.txt")
BORRADOS=$(wc -l < "$WORK/solo-copia.txt")
COMUNES=$(wc -l < "$WORK/comunes.txt")

echo ""
echo "  En ambos:              $COMUNES"
echo "  Nuevos desde el backup: $NUEVOS  (se respaldarán en la próxima corrida)"
echo "  Borrados desde el backup: $BORRADOS  (el snapshot los conserva)"

if [ "$COMUNES" -eq 0 ]; then
    echo ""
    echo "  ERROR: no hay ni un archivo en común. El snapshot no corresponde"
    echo "         a este origen, o está vacío."
    exit 2
fi

# ── Qué se compara ─────────────────────────────────────────────────────
if [ "$SAMPLE" -gt 0 ] && [ "$SAMPLE" -lt "$COMUNES" ]; then
    shuf -n "$SAMPLE" "$WORK/comunes.txt" > "$WORK/a-comparar.txt"
    echo ""
    echo "  Comparando una muestra aleatoria de $SAMPLE archivos..."
else
    cp "$WORK/comunes.txt" "$WORK/a-comparar.txt"
    echo ""
    echo "  Comparando los $COMUNES archivos, byte a byte..."
fi

DISTINTOS=0
COMPARTEN_INODO=0
OK=0

while IFS= read -r rel; do
    src="$SOURCE_DIR/${rel#./}"
    bak="$LATEST/${rel#./}"

    if ! cmp -s "$src" "$bak"; then
        echo "    DIFERENTE: $rel"
        DISTINTOS=$((DISTINTOS + 1))
        continue
    fi

    # Los hardlinks de --link-dest apuntan al snapshot ANTERIOR, nunca al
    # original. Si original y copia compartieran inodo no habría dos copias
    # del dato, sino una con dos nombres: corromper el original corrompería
    # el respaldo en el mismo acto.
    if [ "$(stat -c %i "$src")" = "$(stat -c %i "$bak")" ]; then
        echo "    MISMO INODO (no es una copia real): $rel"
        COMPARTEN_INODO=$((COMPARTEN_INODO + 1))
        continue
    fi

    OK=$((OK + 1))
done < "$WORK/a-comparar.txt"

echo ""
echo "  Idénticos y con dato propio: $OK"
[ "$DISTINTOS" -gt 0 ] && echo "  Con contenido distinto:      $DISTINTOS"
[ "$COMPARTEN_INODO" -gt 0 ] && echo "  Sin dato propio:             $COMPARTEN_INODO"

# ── La copia externa ───────────────────────────────────────────────────
#
# Lo de arriba compara dos rutas del MISMO disco. Si ese disco muere se van
# las dos. La única copia que sobrevive es la remota, así que también hay
# que comprobarla: `rclone check` compara hashes, no fechas ni tamaños.
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
REMOTO_FALLO=0

if [ -z "$RCLONE_REMOTE" ]; then
    echo ""
    echo "  (Copia externa no verificada: RCLONE_REMOTE no está definido)"
elif ! command -v rclone >/dev/null 2>&1; then
    echo ""
    echo "  AVISO: RCLONE_REMOTE definido pero rclone no está instalado."
    REMOTO_FALLO=1
else
    echo ""
    echo "  Verificando la copia externa en $RCLONE_REMOTE (por hash)..."
    # --one-way: al remoto le sobran archivos a propósito (se usa `copy`, que
    # nunca borra). Lo que importa es que no le FALTE ninguno.
    if rclone check "$LATEST/" "$RCLONE_REMOTE/" --one-way; then
        echo "  Copia externa íntegra."
    else
        echo "  ERROR: la copia externa no coincide con el snapshot."
        REMOTO_FALLO=1
    fi
fi

echo "============================================"

if [ "$DISTINTOS" -gt 0 ] || [ "$COMPARTEN_INODO" -gt 0 ] || [ "$REMOTO_FALLO" -ne 0 ]; then
    echo "  RESULTADO: HAY PROBLEMAS. Revisar antes de confiar en este respaldo."
    exit 1
fi

if [ "$SAMPLE" -gt 0 ] && [ "$SAMPLE" -lt "$COMUNES" ]; then
    echo "  RESULTADO: la muestra de $SAMPLE archivos restaura correctamente."
else
    echo "  RESULTADO: los $OK archivos del snapshot restauran correctamente."
fi
echo "============================================"
