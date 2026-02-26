import React, {
    useRef, useState, useCallback, useEffect,
    forwardRef, useImperativeHandle,
} from 'react';

// ─── Contrato que el padre puede usar via ref ────────────────────────────────
// forwardRef necesita saber el "tipo" del handle que exponemos.
// Así CreateCoursePage puede escribir: thumbnailRef.current?.getCroppedFile()
export interface ThumbnailUploaderHandle {
    getCroppedFile(): Promise<File | null>;
}

// ─── Constantes de validación ────────────────────────────────────────────────
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ─── Componente ───────────────────────────────────────────────────────────────
/**
 * ThumbnailUploader — Sube una imagen y deja encuadrarla arrastrando.
 *
 * Este componente usa dos patrones avanzados de React:
 *
 * 1. forwardRef: permite al padre (CreateCoursePage) obtener una referencia
 *    a este componente y llamar a getCroppedFile() en el momento del submit.
 *    Sin esto, el padre no tiene forma de "pedirle" algo al hijo.
 *
 * 2. useImperativeHandle: define QUÉ métodos exponemos al padre via ref.
 *    Es la "API pública" del componente. Solo exponemos lo mínimo necesario.
 *
 * No tiene props externas — toda la lógica vive aquí adentro.
 */
export const ThumbnailUploader = forwardRef<ThumbnailUploaderHandle>((_props, ref) => {

    // ── Estado ────────────────────────────────────────────────────────────────
    const [originalFile, setOriginalFile] = useState<File | null>(null);

    // objectUrl es una URL temporal tipo "blob:http://localhost:5173/abc123..."
    // El navegador la crea en memoria — perfecta para previews sin subir nada.
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    // displayedSize es el tamaño (en px) de la imagen dentro del contenedor,
    // calculado al cargar la imagen para que "cubra" el área sin dejar huecos.
    const [displayedSize, setDisplayedSize] = useState({ w: 0, h: 0 });

    // imgPos es la traslación de la imagen dentro del contenedor.
    // Cuando la imagen es más grande que el contenedor, este valor es negativo
    // (la imagen se "desplaza" a la izquierda/arriba respecto al contenedor).
    const [imgPos, setImgPos] = useState({ x: 0, y: 0 });

    const [isDragging, setIsDragging] = useState(false);    // pan de la imagen
    const [isDropZone, setIsDropZone] = useState(false);    // drag de archivo encima
    const [error, setError] = useState<string | null>(null);

    // ── Refs ──────────────────────────────────────────────────────────────────
    // containerRef: leer clientWidth/clientHeight del área de crop
    const containerRef = useRef<HTMLDivElement>(null);
    // imgRef: acceder a naturalWidth/naturalHeight para calcular escala y recortar
    const imgRef = useRef<HTMLImageElement>(null);
    // inputRef: abrir el explorador de archivos programáticamente al hacer clic
    const inputRef = useRef<HTMLInputElement>(null);

    // dragStartRef guarda el punto de inicio del drag SIN causar re-renders.
    // Si usáramos useState, cada movimiento del ratón dispararía un render extra.
    // Con useRef, guardamos el valor y lo leemos en el handler sin re-renderizar.
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, imgX: 0, imgY: 0 });

    // ── Manejo de archivo ─────────────────────────────────────────────────────

    const handleFile = (file: File) => {
        setError(null);

        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError('Solo se aceptan imágenes JPG, PNG o WEBP.');
            return;
        }
        if (file.size > MAX_SIZE_BYTES) {
            setError(`La imagen no puede pesar más de ${MAX_SIZE_MB} MB.`);
            return;
        }

        // Liberamos la URL anterior para no acumular memoria
        if (objectUrl) URL.revokeObjectURL(objectUrl);

        setOriginalFile(file);
        setObjectUrl(URL.createObjectURL(file));
        // Reseteamos el tamaño y posición — se recalcularán en onLoad
        setDisplayedSize({ w: 0, h: 0 });
        setImgPos({ x: 0, y: 0 });
    };

    const handleRemove = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setOriginalFile(null);
        setObjectUrl(null);
        setDisplayedSize({ w: 0, h: 0 });
        setImgPos({ x: 0, y: 0 });
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    // ── Cálculo de escala al cargar la imagen ─────────────────────────────────
    /**
     * Se ejecuta cuando la imagen termina de cargarse en el DOM.
     * Calcula la escala mínima para que la imagen cubra el contenedor
     * (igual que CSS object-fit: cover) y centra la imagen.
     *
     *   scale = max(containerW / naturalW, containerH / naturalH)
     *
     * Si la imagen es más ancha que alta (landscape) y el contenedor es 16:9,
     * puede que scale lo calcule por alto. Ejemplo:
     *   naturalW=1920, naturalH=1440 (4:3), containerW=600, containerH=337
     *   scaleByW = 600/1920 = 0.3125  → displayedH = 1440 × 0.3125 = 450 > 337 ✓
     *   scaleByH = 337/1440 = 0.234   → displayedW = 1920 × 0.234 = 449 < 600 ✗
     *   scale = 0.3125 (la que cubre ambas dimensiones)
     */
    const handleImgLoad = () => {
        if (!containerRef.current || !imgRef.current) return;

        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;
        const { naturalWidth, naturalHeight } = imgRef.current;

        const scale = Math.max(containerW / naturalWidth, containerH / naturalHeight);
        const w = naturalWidth * scale;
        const h = naturalHeight * scale;

        setDisplayedSize({ w, h });
        // Centrar: si la imagen es más grande que el contenedor en alguna dimensión,
        // el offset será negativo (la imagen empieza "fuera" del contenedor por la izquierda/arriba)
        setImgPos({ x: (containerW - w) / 2, y: (containerH - h) / 2 });
    };

    // ── Drag para encuadrar ───────────────────────────────────────────────────

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!originalFile) return;
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            imgX: imgPos.x,
            imgY: imgPos.y,
        };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!originalFile) return;
        const touch = e.touches[0];
        setIsDragging(true);
        dragStartRef.current = {
            mouseX: touch.clientX,
            mouseY: touch.clientY,
            imgX: imgPos.x,
            imgY: imgPos.y,
        };
    };

    /**
     * Escuchamos mousemove/touchmove en `window` (no en el contenedor).
     * ¿Por qué? Si el usuario mueve el ratón más rápido que el re-render,
     * puede salir del contenedor y el drag se detendría. Escuchar en window
     * garantiza que seguimos trackeando aunque el cursor esté fuera.
     *
     * El clamp asegura que la imagen SIEMPRE cubre el contenedor:
     *   x no puede ser > 0 (imagen no se puede mover tan a la derecha que deje hueco a la izquierda)
     *   x no puede ser < containerW - displayedW (ídem para la derecha)
     */
    useEffect(() => {
        if (!isDragging) return;

        const clamp = (value: number, min: number, max: number) =>
            Math.min(max, Math.max(min, value));

        const move = (clientX: number, clientY: number) => {
            if (!containerRef.current) return;
            const { w, h } = displayedSize;
            const containerW = containerRef.current.clientWidth;
            const containerH = containerRef.current.clientHeight;

            const newX = dragStartRef.current.imgX + (clientX - dragStartRef.current.mouseX);
            const newY = dragStartRef.current.imgY + (clientY - dragStartRef.current.mouseY);

            setImgPos({
                x: clamp(newX, containerW - w, 0),
                y: clamp(newY, containerH - h, 0),
            });
        };

        const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault(); // evita scroll en móvil mientras arrastra
            move(e.touches[0].clientX, e.touches[0].clientY);
        };
        const onEnd = () => setIsDragging(false);

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onEnd);

        // Cleanup: removemos los listeners cuando termina el drag
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isDragging, displayedSize]);

    // ── Canvas crop ───────────────────────────────────────────────────────────
    /**
     * Recorta la imagen usando el Canvas API y devuelve un File con el resultado.
     *
     * La clave matemática:
     *   imgPos.x es la traslación de la imagen. Si es -100, la imagen está
     *   desplazada 100px a la izquierda, lo que significa que lo visible empieza
     *   en el píxel 100 de la imagen (en coordenadas de pantalla).
     *
     *   Para pasarlo a coordenadas naturales de la imagen:
     *   srcX = -imgPos.x * (naturalW / displayedW)
     *
     * useCallback asegura que getCroppedFile no cambia de referencia en cada
     * render, solo cuando cambian imgPos, displayedSize u originalFile.
     * Esto es necesario para que useImperativeHandle funcione correctamente.
     */
    const getCroppedFile = useCallback(async (): Promise<File | null> => {
        if (!originalFile || !imgRef.current || !containerRef.current) return null;
        if (displayedSize.w === 0) return null;

        const img = imgRef.current;
        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;

        // Factor de conversión: de píxeles de pantalla a píxeles naturales de la imagen
        const scaleX = img.naturalWidth / displayedSize.w;
        const scaleY = img.naturalHeight / displayedSize.h;

        // Esquina superior izquierda del área visible, en coordenadas naturales
        const srcX = -imgPos.x * scaleX;
        const srcY = -imgPos.y * scaleY;

        // Tamaño del área visible, en coordenadas naturales
        const srcW = containerW * scaleX;
        const srcH = containerH * scaleY;

        // Creamos un canvas del mismo tamaño que el contenedor
        const canvas = document.createElement('canvas');
        canvas.width = containerW;
        canvas.height = containerH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // drawImage(imagen, srcX, srcY, srcW, srcH, destX, destY, destW, destH)
        // Lee el rectángulo [srcX, srcY, srcW, srcH] de la imagen original
        // y lo dibuja en el canvas en [0, 0, containerW, containerH]
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, containerW, containerH);

        const mimeType = originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const ext = mimeType === 'image/png' ? 'png' : 'jpg';

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) { resolve(null); return; }
                    resolve(new File([blob], `thumbnail.${ext}`, { type: mimeType }));
                },
                mimeType,
                0.92, // calidad JPEG: 0.92 es un buen balance tamaño/calidad
            );
        });
    }, [originalFile, imgPos, displayedSize]);

    // Exponemos getCroppedFile al padre via ref.
    // El segundo argumento son las dependencias — cada vez que getCroppedFile
    // cambia (por cambio de imgPos, etc.), el handle del ref se actualiza.
    useImperativeHandle(ref, () => ({ getCroppedFile }), [getCroppedFile]);

    // ── Handlers del drop zone ────────────────────────────────────────────────

    const handleDropZoneDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDropZone(true);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="thumbnail-uploader">
            <label className="thumbnail-uploader__label">Miniatura del curso</label>

            {objectUrl ? (
                <>
                    {/*
                      * Zona de crop: contenedor fijo 16:9 con la imagen posicionada
                      * absolutamente dentro. El usuario arrastra el contenedor (no la
                      * imagen directamente) porque así capturamos el evento aunque el
                      * cursor esté en el hueco entre la imagen y el borde.
                      */}
                    <div
                        ref={containerRef}
                        className={`thumbnail-crop ${isDragging ? 'thumbnail-crop--dragging' : ''}`}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                    >
                        {/*
                          * La imagen se posiciona con transform: translate(x, y).
                          * Los transforms son más eficientes que cambiar left/top porque
                          * el navegador los procesa en la GPU sin recalcular el layout.
                          */}
                        <img
                            ref={imgRef}
                            src={objectUrl}
                            alt="Vista previa de la miniatura"
                            className="thumbnail-crop__image"
                            style={displayedSize.w > 0 ? {
                                width: displayedSize.w,
                                height: displayedSize.h,
                                transform: `translate(${imgPos.x}px, ${imgPos.y}px)`,
                            } : { opacity: 0 }}
                            onLoad={handleImgLoad}
                            draggable={false}
                        />

                        {displayedSize.w > 0 && (
                            <div className="thumbnail-crop__hint">
                                ↕ Arrastra para encuadrar
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="thumbnail-uploader__remove"
                        onClick={handleRemove}
                    >
                        ✕ Quitar imagen
                    </button>
                </>
            ) : (
                <div
                    className={`thumbnail-uploader__drop-zone ${isDropZone ? 'thumbnail-uploader__drop-zone--dragging' : ''}`}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={handleDropZoneDragOver}
                    onDragLeave={() => setIsDropZone(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDropZone(false);
                        const file = e.dataTransfer.files[0];
                        if (file) handleFile(file);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                    aria-label="Área para subir miniatura"
                >
                    <span className="thumbnail-uploader__icon">🖼️</span>
                    <p className="thumbnail-uploader__text">
                        Arrastra tu imagen aquí o{' '}
                        <span className="thumbnail-uploader__link">haz clic para seleccionar</span>
                    </p>
                    <p className="thumbnail-uploader__hint">JPG, PNG o WEBP · Máximo {MAX_SIZE_MB} MB</p>
                </div>
            )}

            {error && <p className="thumbnail-uploader__error">⚠️ {error}</p>}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                }}
                style={{ display: 'none' }}
            />
        </div>
    );
});

ThumbnailUploader.displayName = 'ThumbnailUploader';
