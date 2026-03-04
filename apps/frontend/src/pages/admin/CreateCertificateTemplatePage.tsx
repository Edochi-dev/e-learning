import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Draggable from 'react-draggable';
import { QRCodeSVG } from 'qrcode.react';
import * as pdfjsLib from 'pdfjs-dist';
import { useAuth } from '../../context/AuthContext';
import type { CertificateGateway, CertificateTemplate } from '../../gateways/CertificateGateway';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface Props {
    gateway: CertificateGateway;
}

// ─── Opciones de fuente ─────────────────────────────────────────────────────
// El 'value' es la clave exacta del enum StandardFonts de pdf-lib en el backend.
// El 'css' es la fuente CSS equivalente para que el preview sea fiel.
const FONT_OPTIONS = [
    { value: 'Helvetica',       label: 'Helvetica (sans-serif moderno)',    css: 'Helvetica, Arial, sans-serif',   weight: 'normal', style: 'normal' },
    { value: 'HelveticaBold',   label: 'Helvetica Bold (sans-serif negrita)', css: 'Helvetica, Arial, sans-serif', weight: 'bold',   style: 'normal' },
    { value: 'TimesRoman',      label: 'Times Roman (serif clásico)',       css: 'Times New Roman, serif',         weight: 'normal', style: 'normal' },
    { value: 'TimesBold',       label: 'Times Bold (serif negrita)',        css: 'Times New Roman, serif',         weight: 'bold',   style: 'normal' },
    { value: 'TimesItalic',     label: 'Times Italic (serif cursiva)',      css: 'Times New Roman, serif',         weight: 'normal', style: 'italic' },
    { value: 'TimesBoldItalic', label: 'Times Bold Italic (elegante)',      css: 'Times New Roman, serif',         weight: 'bold',   style: 'italic' },
] as const;

// ─── Posiciones iniciales de los elementos dummy ──────────────────────────────
// Expresadas como fracción del tamaño del contenedor (0 = borde izq/sup, 1 = borde der/inf)
const INITIAL_NAME_PCT = { x: 0.50, y: 0.35 };
const INITIAL_QR_PCT   = { x: 0.78, y: 0.72 };

/**
 * CreateCertificateTemplatePage — Paso 2: Picker visual con drag-and-drop
 *
 * SISTEMA DE COORDENADAS:
 * ─────────────────────────────────────────────────────────────────────────────
 * Internamente guardamos posiciones como PROPORCIÓN del contenedor CSS (0–1).
 *
 *   pctX = elemento.left_css / contenedor.width_css
 *   pctY = elemento.top_css  / contenedor.height_css
 *
 * Esto es robusto: no importa si el canvas tiene 800px internos pero se muestra
 * a 650px por CSS. La proporción siempre es correcta.
 *
 * Al GUARDAR, multiplicamos por las dimensiones del PDF (puntos PDF):
 *   pdfX = pctX * template.pageWidth
 *   pdfY = pctY * template.pageHeight
 *
 * El backend (PdfCertificateGenerator) recibe esas coordenadas en puntos PDF
 * con origen en la esquina SUPERIOR-IZQUIERDA, y luego convierte internamente
 * al sistema de pdf-lib (origen inferior-izquierda):
 *   pdfLibY = pageHeight - pdfY - fontSize   (para texto)
 *   pdfLibY = pageHeight - pdfY - qrSize     (para imagen QR)
 *
 * DRAG-AND-DROP:
 * ─────────────────────────────────────────────────────────────────────────────
 * Usamos react-draggable con bounds="parent" para que los elementos no salgan
 * del contenedor. El callback onStop recibe la posición en píxeles CSS del
 * elemento relativa al contenedor, que convertimos a proporción.
 */
export const CreateCertificateTemplatePage: React.FC<Props> = ({ gateway }) => {
    const { token } = useAuth();
    const navigate = useNavigate();

    // ── Paso 1: formulario ────────────────────────────────────────────────────
    const [formName, setFormName] = useState('');
    const [formAbbr, setFormAbbr] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [template, setTemplate] = useState<CertificateTemplate | null>(null);

    // ── Renderizado del PDF ───────────────────────────────────────────────────
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // react-draggable requiere nodeRef en React 19 porque ReactDOM.findDOMNode fue eliminado
    const nameNodeRef = useRef<HTMLDivElement>(null);
    const qrNodeRef   = useRef<HTMLDivElement>(null);
    // Dimensiones del PDF en puntos (devueltas por el backend al subir)
    // Las necesitamos para convertir proporción → puntos PDF al guardar.
    const [pdfDims, setPdfDims] = useState({ w: 0, h: 0 });

    // ── Posiciones de los elementos dummy (como proporción 0–1) ───────────────
    const [namePct, setNamePct] = useState(INITIAL_NAME_PCT);
    const [qrPct,   setQrPct]   = useState(INITIAL_QR_PCT);

    // ── Opciones de estilo ────────────────────────────────────────────────────
    const [fontFamily, setFontFamily] = useState('Helvetica');
    const [fontSize, setFontSize]     = useState(28);
    const [nameColor, setNameColor]   = useState('#000000');
    const [qrSize, setQrSize]         = useState(80);

    // ── Estado de UI ──────────────────────────────────────────────────────────
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState<string | null>(null);

    // La fuente actualmente seleccionada (para el preview del dummy)
    const selectedFont = FONT_OPTIONS.find(f => f.value === fontFamily) ?? FONT_OPTIONS[0];

    // ── Renderizar PDF en canvas ──────────────────────────────────────────────
    const renderPdf = useCallback(async (pdfFile: File) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1 });
        const maxWidth = 780;
        const scale = Math.min(maxWidth / viewport.width, 1.5);
        const scaledViewport = page.getViewport({ scale });

        canvas.width  = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport: scaledViewport, canvas }).promise;
    }, []);

    // Necesitamos 'template' como dependencia: el <canvas> solo existe en el DOM
    // una vez que template != null (paso 2). Si solo dependiera de 'file',
    // el effect correría cuando el canvas aún no está montado y canvasRef.current
    // sería null. Al agregar 'template', el effect vuelve a correr cuando
    // el canvas aparece en el DOM por primera vez.
    useEffect(() => {
        if (file && template) renderPdf(file).catch(console.error);
    }, [file, template, renderPdf]);

    // Cuando el template viene del backend, guardamos las dimensiones del PDF
    useEffect(() => {
        if (template) setPdfDims({ w: template.pageWidth, h: template.pageHeight });
    }, [template]);

    // ── Paso 1: subir la plantilla ────────────────────────────────────────────
    const handleUpload = async () => {
        if (!token || !formName || !formAbbr || !file) return;
        setUploading(true);
        setError(null);
        try {
            const result = await gateway.uploadTemplate(formName, formAbbr, file, token);
            setTemplate(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al subir la plantilla');
        } finally {
            setUploading(false);
        }
    };

    // ── Calcular el tamaño en píxeles CSS de los elementos dummy ─────────────
    // El canvas tiene 'canvas.width' píxeles internos pero 'containerRef.offsetWidth' en CSS.
    // El factor de escala CSS = containerCssWidth / pdfPageWidth.
    // Así el dummy tiene exactamente el mismo tamaño visual que tendrá en el PDF.
    const getDisplayScale = (): number => {
        if (!containerRef.current || !pdfDims.w) return 1;
        return containerRef.current.offsetWidth / pdfDims.w;
    };

    const displayFontSize = () => Math.round(fontSize * getDisplayScale());
    const displayQrSize   = () => Math.round(qrSize   * getDisplayScale());

    // ── Paso 2: guardar las posiciones ────────────────────────────────────────
    const handleSave = async () => {
        if (!token || !template) return;
        setSaving(true);
        setError(null);
        try {
            await gateway.updateTemplatePositions(template.id, {
                namePositionX: namePct.x * pdfDims.w,
                namePositionY: namePct.y * pdfDims.h,
                nameFontSize:  fontSize,
                nameColor,
                fontFamily,
                qrPositionX:   qrPct.x * pdfDims.w,
                qrPositionY:   qrPct.y * pdfDims.h,
                qrSize,
            }, token);
            navigate('/admin/certificados');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar posiciones');
        } finally {
            setSaving(false);
        }
    };

    // ── Callback de react-draggable al soltar un elemento ─────────────────────
    // data.x y data.y son los píxeles CSS desde el origen del contenedor padre.
    const onNameStop = (_: unknown, data: { x: number; y: number }) => {
        if (!containerRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        setNamePct({ x: data.x / w, y: data.y / h });
    };

    const onQrStop = (_: unknown, data: { x: number; y: number }) => {
        if (!containerRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        setQrPct({ x: data.x / w, y: data.y / h });
    };

    // ── Posición inicial de los elementos en px (para react-draggable) ────────
    // Se recalcula cuando el contenedor cambia de tamaño.
    const nameInitPx = () => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        return { x: namePct.x * w, y: namePct.y * h };
    };

    const qrInitPx = () => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        return { x: qrPct.x * w, y: qrPct.y * h };
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Nueva Plantilla de Certificado</h1>
                <p>Sube el PDF en blanco y posiciona el nombre y el QR arrastrándolos.</p>
            </div>

            {/* ── PASO 1: Subir PDF ─────────────────────────────────────── */}
            {!template ? (
                <div className="admin-card" style={{ maxWidth: '520px' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label">Nombre de la plantilla</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: Manicure Rusa"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                        />
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label">Abreviatura del certificado</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: MR"
                            value={formAbbr}
                            onChange={e => setFormAbbr(e.target.value.toUpperCase())}
                            maxLength={5}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Los números serán: {formAbbr || 'XX'}-00001, {formAbbr || 'XX'}-00002…
                        </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label">Archivo PDF (plantilla en blanco)</label>
                        <input
                            type="file"
                            accept="application/pdf"
                            className="form-input"
                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                        />
                    </div>

                    {error && <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem' }}>{error}</p>}

                    <button
                        className="btn-primary"
                        onClick={handleUpload}
                        disabled={uploading || !formName || !formAbbr || !file}
                    >
                        {uploading ? 'Subiendo…' : 'Continuar →'}
                    </button>
                </div>

            /* ── PASO 2: Picker drag-and-drop ───────────────────────────── */
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>

                    {/* ── Canvas + elementos arrastrables ── */}
                    <div>
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '2px solid var(--border)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                        }}>
                            <p style={{ textAlign: 'center', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                Arrastra cada elemento a su posición en el certificado
                            </p>

                            {/* El contenedor debe ser position:relative para que
                                react-draggable y los elementos absolute funcionen correctamente */}
                            <div
                                ref={containerRef}
                                style={{ position: 'relative', display: 'inline-block', width: '100%' }}
                            >
                                {/* PDF renderizado como fondo no interactivo */}
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                        pointerEvents: 'none', // el canvas no captura eventos: los recibe el contenedor
                                    }}
                                />

                                {/* ── Dummy del NOMBRE ── */}
                                <Draggable
                                    nodeRef={nameNodeRef}
                                    bounds="parent"
                                    defaultPosition={nameInitPx()}
                                    onStop={onNameStop}
                                >
                                    <div ref={nameNodeRef} style={{
                                        position: 'absolute',
                                        cursor: 'grab',
                                        userSelect: 'none',
                                        padding: '2px 6px',
                                        background: 'rgba(232, 67, 147, 0.12)',
                                        border: '1.5px dashed #e84393',
                                        borderRadius: '3px',
                                        // Fuente y tamaño igual al del certificado real
                                        fontFamily: selectedFont.css,
                                        fontWeight: selectedFont.weight,
                                        fontStyle: selectedFont.style,
                                        fontSize: `${displayFontSize()}px`,
                                        color: nameColor,
                                        whiteSpace: 'nowrap',
                                        lineHeight: 1,
                                    }}>
                                        ✍ Ana García
                                    </div>
                                </Draggable>

                                {/* ── Dummy del QR ── */}
                                <Draggable
                                    nodeRef={qrNodeRef}
                                    bounds="parent"
                                    defaultPosition={qrInitPx()}
                                    onStop={onQrStop}
                                >
                                    <div ref={qrNodeRef} style={{
                                        position: 'absolute',
                                        cursor: 'grab',
                                        userSelect: 'none',
                                        border: '1.5px dashed #d4a574',
                                        background: 'rgba(212, 165, 116, 0.1)',
                                        width:  `${displayQrSize()}px`,
                                        height: `${displayQrSize()}px`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                    }}>
                                        {/* QR real (con URL de ejemplo) para preview fiel */}
                                        <QRCodeSVG
                                            value="https://marsnailsacademy.com/certificados/ejemplo"
                                            size={displayQrSize()}
                                        />
                                    </div>
                                </Draggable>
                            </div>
                        </div>

                        {/* Leyenda */}
                        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
                            <span><span style={{ color: '#e84393', fontWeight: 700 }}>━ ━</span> Nombre del alumno</span>
                            <span><span style={{ color: '#d4a574', fontWeight: 700 }}>━ ━</span> Código QR</span>
                        </div>
                    </div>

                    {/* ── Panel de opciones ── */}
                    <div className="admin-card">
                        <h3 style={{ marginBottom: '1.25rem' }}>Opciones de estilo</h3>

                        {/* Fuente */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Tipo de letra</label>
                            <select
                                className="form-input"
                                value={fontFamily}
                                onChange={e => setFontFamily(e.target.value)}
                            >
                                {FONT_OPTIONS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                            {/* Preview de la fuente */}
                            <p style={{
                                fontFamily: selectedFont.css,
                                fontWeight: selectedFont.weight,
                                fontStyle: selectedFont.style,
                                fontSize: '1.1rem',
                                marginTop: '0.4rem',
                                color: nameColor,
                                background: 'var(--bg-secondary, #f5f5f5)',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                            }}>
                                Ana García
                            </p>
                        </div>

                        {/* Tamaño de fuente */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Tamaño de fuente (pts PDF)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="range"
                                    min={12}
                                    max={80}
                                    value={fontSize}
                                    onChange={e => setFontSize(Number(e.target.value))}
                                    style={{ flex: 1, accentColor: 'var(--primary)' }}
                                />
                                <span style={{ minWidth: '2.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                                    {fontSize}pt
                                </span>
                            </div>
                        </div>

                        {/* Color */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label">Color del nombre</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={nameColor}
                                    onChange={e => setNameColor(e.target.value)}
                                    style={{ width: '44px', height: '36px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }}
                                />
                                <input
                                    type="text"
                                    className="form-input"
                                    value={nameColor}
                                    onChange={e => setNameColor(e.target.value)}
                                    style={{ fontFamily: 'monospace', flex: 1 }}
                                />
                            </div>
                        </div>

                        <hr style={{ marginBottom: '1.25rem', borderColor: 'var(--border)' }} />

                        {/* Tamaño del QR */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Tamaño del QR (pts PDF)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="range"
                                    min={40}
                                    max={180}
                                    value={qrSize}
                                    onChange={e => setQrSize(Number(e.target.value))}
                                    style={{ flex: 1, accentColor: 'var(--gold, #d4a574)' }}
                                />
                                <span style={{ minWidth: '2.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                                    {qrSize}pt
                                </span>
                            </div>
                        </div>

                        {error && (
                            <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                {error}
                            </p>
                        )}

                        <button
                            className="btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                            style={{ width: '100%' }}
                        >
                            {saving ? 'Guardando…' : 'Guardar Plantilla'}
                        </button>

                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
                            PDF: {Math.round(pdfDims.w)} × {Math.round(pdfDims.h)} pts
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
