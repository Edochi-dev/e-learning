import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';

// ─── Contrato expuesto al padre via ref ──────────────────────────────────────
export interface ThumbnailUploaderHandle {
    getCroppedFile(): Promise<File | null>;
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ASPECT = 16 / 9;

// ─── Helper: recorte con Canvas ───────────────────────────────────────────────
/**
 * Recibe la URL de la imagen y el rectángulo exacto que react-easy-crop calculó
 * (en píxeles reales de la imagen original) y devuelve un File ya recortado.
 *
 * pixelCrop = { x, y, width, height } en coordenadas naturales de la imagen.
 * Es decir, si la imagen mide 1920x1080 y el usuario encuadró la parte central,
 * pixelCrop podría ser { x: 200, y: 113, width: 1520, height: 855 }.
 */
async function cropToFile(imageSrc: string, pixelCrop: Area, _originalFile: File): Promise<File> {
    // Cargamos la imagen en un objeto HTMLImageElement para poder dibujarla en Canvas
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas');

    // drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
    // Toma el rectángulo [sx, sy, sw, sh] de la imagen fuente
    // y lo pinta en el canvas en [dx, dy, dw, dh]
    ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height,
    );

    const mimeType = _originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) { reject(new Error('toBlob falló')); return; }
                resolve(new File([blob], `thumbnail.${ext}`, { type: mimeType }));
            },
            mimeType,
            0.92,
        );
    });
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const ThumbnailUploader = forwardRef<ThumbnailUploaderHandle>((_props, ref) => {

    // Estado del archivo — solo objectUrl controla el render; el File se lee via ref
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    // Estado del crop — react-easy-crop los necesita como props controladas
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);

    // Estado del drag-and-drop del archivo
    const [isDropZone, setIsDropZone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    // ── Por qué refs y no state para getCroppedFile ──────────────────────────
    // getCroppedFile se llama UNA vez al hacer submit, no durante el render.
    // Si guardáramos croppedAreaPixels en state y la incluyéramos en useCallback,
    // se recrearía con cada movimiento del usuario. Con refs, la función siempre
    // lee el valor más reciente sin necesitar dependencias.
    const croppedAreaPixelsRef = useRef<Area | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const originalFileRef = useRef<File | null>(null);

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

        if (objectUrl) URL.revokeObjectURL(objectUrl);
        const url = URL.createObjectURL(file);

        setObjectUrl(url);
        setCrop({ x: 0, y: 0 });
        setZoom(1);

        // Actualizamos los refs también
        originalFileRef.current = file;
        objectUrlRef.current = url;
        croppedAreaPixelsRef.current = null;
    };

    const handleRemove = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setError(null);
        originalFileRef.current = null;
        objectUrlRef.current = null;
        croppedAreaPixelsRef.current = null;
        if (inputRef.current) inputRef.current.value = '';
    };

    // ── Callback de react-easy-crop ───────────────────────────────────────────
    // onCropComplete se dispara cada vez que el usuario suelta el encuadre.
    // Recibe dos valores:
    //   croppedArea       → porcentaje (0-100) del área recortada
    //   croppedAreaPixels → píxeles exactos de la imagen original
    // Nosotros solo necesitamos los píxeles para el Canvas.
    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        croppedAreaPixelsRef.current = croppedAreaPixels;
    }, []);

    // ── API expuesta al padre ─────────────────────────────────────────────────
    // Esta función lee los refs (siempre actualizados) y produce el File recortado.
    // Al usar refs, getCroppedFile nunca necesita recrearse → useImperativeHandle
    // tampoco se actualiza en cada movimiento del usuario.
    const getCroppedFile = useCallback(async (): Promise<File | null> => {
        const pixels = croppedAreaPixelsRef.current;
        const url = objectUrlRef.current;
        const file = originalFileRef.current;
        if (!pixels || !url || !file) return null;
        return cropToFile(url, pixels, file);
    }, []); // deps vacías: lee refs, no cierra sobre state

    useImperativeHandle(ref, () => ({ getCroppedFile }), [getCroppedFile]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="thumbnail-uploader">
            <label className="thumbnail-uploader__label">Miniatura del curso</label>

            {objectUrl ? (
                <>
                    {/*
                      * react-easy-crop necesita un contenedor con position: relative
                      * y altura definida. El aspect-ratio 16:9 la define automáticamente.
                      * El componente Cropper se expande para llenar todo el contenedor.
                      */}
                    <div className="thumbnail-crop">
                        <Cropper
                            image={objectUrl}
                            crop={crop}
                            zoom={zoom}
                            aspect={ASPECT}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            showGrid={false}
                            zoomWithScroll
                        />
                    </div>

                    {/* Slider de zoom — el usuario también puede hacer pinch en móvil */}
                    <div className="thumbnail-crop__controls">
                        <span className="thumbnail-crop__zoom-icon">−</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="thumbnail-crop__zoom-slider"
                            aria-label="Zoom de la miniatura"
                        />
                        <span className="thumbnail-crop__zoom-icon">+</span>
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
                    onDragOver={(e) => { e.preventDefault(); setIsDropZone(true); }}
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
