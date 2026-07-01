import { useRef, useState } from 'react';

// ─── Contrato del componente ─────────────────────────────────────────────────
// Componente CONTROLADO: no guarda el archivo, solo lo reporta al padre via
// onFileChange. El padre decide qué hacer (validar, subir, etc.). Así el mismo
// uploader sirve para cualquier flujo de subida de PDF sin acoplarse a uno.
interface PdfUploaderProps {
    file: File | null;
    onFileChange: (file: File | null) => void;
    error?: string | null;
    label?: string;
    /** Texto de ayuda bajo la zona (ej. tamaño máximo). La validación la hace el padre. */
    hint?: string;
}

// Formatea bytes a un texto legible (KB / MB) para el card del archivo.
function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * PdfUploader — drop-zone estilizada para subir un PDF.
 *
 * Sigue el mismo patrón visual que ThumbnailUploader (input nativo oculto +
 * zona clicable con drag & drop), pero SIN recorte: un PDF no se edita, solo
 * se selecciona. Reemplaza el <input type="file"> nativo, que no hereda los
 * estilos globales de inputs y se veía crudo.
 */
export const PdfUploader = ({ file, onFileChange, error, label, hint }: PdfUploaderProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const openPicker = () => inputRef.current?.click();

    const handleRemove = () => {
        onFileChange(null);
        // Limpiamos el value del input para poder re-seleccionar el mismo archivo.
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="pdf-uploader">
            {label && <label className="pdf-uploader__label">{label}</label>}

            {file ? (
                /* Card del archivo ya seleccionado */
                <div className="pdf-uploader__file">
                    <span className="pdf-uploader__file-icon" aria-hidden="true">📄</span>
                    <span className="pdf-uploader__file-info">
                        <span className="pdf-uploader__file-name">{file.name}</span>
                        <span className="pdf-uploader__file-size">{formatSize(file.size)}</span>
                    </span>
                    <button type="button" className="pdf-uploader__remove" onClick={handleRemove}>
                        ✕ Quitar
                    </button>
                </div>
            ) : (
                /* Zona de drop / clic */
                <div
                    className={`pdf-uploader__drop-zone ${isDragging ? 'pdf-uploader__drop-zone--dragging' : ''}`}
                    onClick={openPicker}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        // Solo aceptamos PDFs al arrastrar; el <input> ya filtra por accept.
                        const dropped = e.dataTransfer.files[0];
                        if (dropped && dropped.type === 'application/pdf') onFileChange(dropped);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openPicker()}
                    aria-label="Área para subir PDF"
                >
                    <span className="pdf-uploader__icon" aria-hidden="true">📄</span>
                    <p className="pdf-uploader__text">
                        Arrastra tu PDF aquí o{' '}
                        <span className="pdf-uploader__link">haz clic para seleccionar</span>
                    </p>
                    {hint && <p className="pdf-uploader__hint">{hint}</p>}
                </div>
            )}

            {error && <p className="pdf-uploader__error">⚠ {error}</p>}

            <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
            />
        </div>
    );
};
