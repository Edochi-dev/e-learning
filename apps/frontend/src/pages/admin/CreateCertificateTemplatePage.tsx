import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import type { CertificateGateway, CertificateTemplate } from '../../gateways/CertificateGateway';
import { TemplateDesignPicker } from '../../components/TemplateDesignPicker';
import {
    PAPER_FORMATS,
    FORMAT_TOLERANCE_PTS,
    ptsToMm,
    ptsToPx,
    formatLabel,
} from '../../lib/pdf-units';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface Props {
    gateway: CertificateGateway;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Agrupa los formatos por tamaño de papel para el <optgroup> del selector
const FORMAT_GROUPS = [
    { group: 'A4', formats: PAPER_FORMATS.filter(f => f.value.startsWith('A4')) },
    { group: 'A3', formats: PAPER_FORMATS.filter(f => f.value.startsWith('A3')) },
];

/**
 * CreateCertificateTemplatePage
 *
 * Flujo de creación de plantilla en DOS FASES claramente separadas:
 *
 *   Fase 1 (esta página): formulario para subir el PDF + metadata.
 *     - Validación local del PDF con pdfjs-dist (tamaño, dimensiones vs formato).
 *     - Llamada a uploadTemplate.
 *     - Cuando vuelve la plantilla persistida, se pasa a la fase 2.
 *
 *   Fase 2: editor visual del diseño (posiciones, tipografía, colores, etc.).
 *     - Delegada al componente compartido <TemplateDesignPicker>.
 *     - Mismo componente que usa EditTemplateDesignPage para editar el
 *       diseño de plantillas existentes — sin duplicación.
 *
 * Antes esta página tenía ~830 líneas porque la fase 2 vivía aquí inline.
 * Tras extraer el picker, esta página solo tiene la lógica única de la fase 1
 * (validación y upload). Toda la complejidad del canvas, draggables, sidebar
 * de estilos y guardado de posiciones vive en un único sitio reutilizable.
 */
export const CreateCertificateTemplatePage: React.FC<Props> = ({ gateway }) => {
    const navigate = useNavigate();

    const [formName, setFormName]               = useState('');
    const [formAbbr, setFormAbbr]               = useState('');
    const [formPaperFormat, setFormPaperFormat] = useState('A4 Vertical');
    const [file, setFile]                       = useState<File | null>(null);
    const [template, setTemplate]               = useState<CertificateTemplate | null>(null);

    const [uploading, setUploading] = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    // ── Validación del PDF en cliente ────────────────────────────────────────
    // Usa pdfjs-dist (ya importado) para leer dimensiones sin hacer ninguna
    // petición HTTP — todo sucede en el navegador. Garantiza que el PDF
    // coincide con el formato seleccionado ANTES de subirlo, evitando un
    // round-trip inútil al backend si el archivo no encaja.
    const validateFile = async (selectedFile: File): Promise<string | null> => {
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            return `El archivo pesa ${(selectedFile.size / 1024 / 1024).toFixed(1)} MB. El máximo permitido es ${MAX_FILE_SIZE_MB} MB.`;
        }

        const format = PAPER_FORMATS.find(f => f.value === formPaperFormat);
        if (!format) return null;

        const pdf = await pdfjsLib.getDocument({ data: await selectedFile.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const { width, height } = page.getViewport({ scale: 1 });

        const matchExact = Math.abs(width  - format.wPts) <= FORMAT_TOLERANCE_PTS
                        && Math.abs(height - format.hPts) <= FORMAT_TOLERANCE_PTS;

        if (!matchExact) {
            const actualMmW = ptsToMm(width);
            const actualMmH = ptsToMm(height);
            const actualPxW = ptsToPx(width);
            const actualPxH = ptsToPx(height);
            return `El PDF mide ${actualMmW}×${actualMmH} mm (${actualPxW}×${actualPxH} px) pero el formato ${format.value} requiere ${ptsToMm(format.wPts)}×${ptsToMm(format.hPts)} mm (${ptsToPx(format.wPts)}×${ptsToPx(format.hPts)} px). Verifica que el PDF esté configurado en ${format.value}.`;
        }

        return null;
    };

    const handleFileChange = async (selectedFile: File | null) => {
        setFile(selectedFile);
        setFileError(null);
        if (!selectedFile) return;

        const validationError = await validateFile(selectedFile);
        setFileError(validationError);
    };

    const handleUpload = async () => {
        if (!formName || !formAbbr || !file) return;
        setUploading(true);
        setError(null);
        try {
            const result = await gateway.uploadTemplate(formName, formAbbr, formPaperFormat, file);
            setTemplate(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al subir la plantilla');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="admin-page">
            <Link to="/admin/certificados" className="back-link">← Volver al Panel de Certificados</Link>
            <div className="admin-header">
                <h1>Nueva Plantilla de Certificado</h1>
                <p>Sube el PDF en blanco y posiciona el nombre y el QR arrastrándolos.</p>
            </div>

            {!template ? (
                /* ── FASE 1: subir PDF + metadata ──────────────────────── */
                <div className="admin-card" style={{ maxWidth: '680px' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label">Nombre de la plantilla</label>
                        <input type="text" className="form-input" placeholder="Ej: Manicure Rusa"
                            value={formName} onChange={e => setFormName(e.target.value)} />
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label">Abreviatura del certificado</label>
                        <input type="text" className="form-input" placeholder="Ej: MR"
                            value={formAbbr} onChange={e => setFormAbbr(e.target.value.toUpperCase())} maxLength={5} />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Los números serán: {formAbbr || 'XX'}-00001, {formAbbr || 'XX'}-00002…
                        </p>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label">Formato de papel</label>
                        <select className="form-input" value={formPaperFormat} onChange={e => setFormPaperFormat(e.target.value)}>
                            {FORMAT_GROUPS.map(({ group, formats }) => (
                                <optgroup key={group} label={group}>
                                    {formats.map(f => (
                                        <option key={f.value} value={f.value}>{formatLabel(f)}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            El PDF que subas debe coincidir con este formato para impresión correcta.
                        </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label">Archivo PDF (plantilla en blanco)</label>
                        <input type="file" accept="application/pdf" className="form-input"
                            onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Máximo {MAX_FILE_SIZE_MB} MB · El tamaño del PDF debe coincidir con el formato seleccionado.
                        </p>
                        {fileError && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--error, #e53e3e)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                                ⚠ {fileError}
                            </p>
                        )}
                    </div>

                    {error && <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem' }}>{error}</p>}

                    <button className="btn-primary" onClick={handleUpload}
                        disabled={uploading || !formName || !formAbbr || !file || !!fileError}>
                        {uploading ? 'Subiendo…' : 'Continuar →'}
                    </button>
                </div>
            ) : (
                /* ── FASE 2: picker compartido ─────────────────────────── */
                /* Sin initialStyles → modo creación: el picker arranca con sus
                   defaults visuales hardcoded (posiciones centradas, GreatVibes, etc.) */
                <TemplateDesignPicker
                    template={template}
                    pdfSource={file!}
                    gateway={gateway}
                    onSaved={() => navigate('/admin/certificados')}
                />
            )}
        </div>
    );
};
