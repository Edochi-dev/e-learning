import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Conversiones desde puntos PDF (1 pt = 1/72 pulgada)
// a milímetros y píxeles de impresión (300 DPI — estándar de calidad para imprimir).
const ptsToMm  = (pts: number) => Math.round(pts * 25.4 / 72);
const ptsToPx  = (pts: number) => Math.round(pts * 300 / 72);

// Dimensiones esperadas en puntos PDF con tolerancia de ±10 pts.
// Un "punto PDF" = 1/72 pulgada.
// Vertical (portrait): lado corto × lado largo. Horizontal (landscape): invertido.
const PAPER_FORMATS = [
    { value: 'A4 Vertical',    label: 'Vertical',   wPts: 595,  hPts: 842  },
    { value: 'A4 Horizontal',  label: 'Horizontal', wPts: 842,  hPts: 595  },
    { value: 'A3 Vertical',    label: 'Vertical',   wPts: 842,  hPts: 1191 },
    { value: 'A3 Horizontal',  label: 'Horizontal', wPts: 1191, hPts: 842  },
];
const FORMAT_TOLERANCE_PTS = 10;

// Agrupa los formatos por tamaño de papel para el <optgroup> del selector
const FORMAT_GROUPS = [
    { group: 'A4', formats: PAPER_FORMATS.filter(f => f.value.startsWith('A4')) },
    { group: 'A3', formats: PAPER_FORMATS.filter(f => f.value.startsWith('A3')) },
];

const formatLabel = (fmt: typeof PAPER_FORMATS[number]) =>
    `${fmt.label} — ${ptsToMm(fmt.wPts)}×${ptsToMm(fmt.hPts)} mm (${ptsToPx(fmt.wPts)}×${ptsToPx(fmt.hPts)} px @ 300 DPI)`;

type FontOption = {
    value: string; label: string; css: string;
    weight: string; style: string; group: string;
};

// Padding horizontal de los elementos draggable (debe coincidir con el style inline)
const DRAGGABLE_PADDING_X = 4;

const FONT_OPTIONS: FontOption[] = [
    { value: 'GreatVibes-Regular',               label: 'Great Vibes (caligráfica elegante)',      css: "'Great Vibes', cursive",         weight: 'normal', style: 'normal', group: 'Caligráficas' },
    { value: 'DancingScript-Bold',               label: 'Dancing Script Bold (script moderno)',    css: "'Dancing Script', cursive",       weight: '700',    style: 'normal', group: 'Caligráficas' },
    { value: 'Pacifico-Regular',                 label: 'Pacifico (redondeada festiva)',           css: "'Pacifico', cursive",             weight: 'normal', style: 'normal', group: 'Caligráficas' },
    { value: 'PlayfairDisplay-Regular',          label: 'Playfair Display (serif lujosa)',         css: "'Playfair Display', serif",       weight: '400',    style: 'normal', group: 'Serif elegante' },
    { value: 'PlayfairDisplay-BoldItalic',       label: 'Playfair Display Bold Italic',           css: "'Playfair Display', serif",       weight: '700',    style: 'italic', group: 'Serif elegante' },
    { value: 'CormorantGaramond-SemiBold',       label: 'Cormorant Garamond SemiBold',            css: "'Cormorant Garamond', serif",     weight: '600',    style: 'normal', group: 'Serif elegante' },
    { value: 'CormorantGaramond-SemiBoldItalic', label: 'Cormorant Garamond SemiBold Italic',     css: "'Cormorant Garamond', serif",     weight: '600',    style: 'italic', group: 'Serif elegante' },
    { value: 'Montserrat-Regular',               label: 'Montserrat Regular',                     css: "'Montserrat', sans-serif",        weight: '400',    style: 'normal', group: 'Sans-serif' },
    { value: 'Montserrat-Bold',                  label: 'Montserrat Bold',                        css: "'Montserrat', sans-serif",        weight: '700',    style: 'normal', group: 'Sans-serif' },
    { value: 'Helvetica',                        label: 'Helvetica (estándar PDF)',                css: 'Helvetica, Arial, sans-serif',    weight: 'normal', style: 'normal', group: 'Estándar PDF' },
    { value: 'HelveticaBold',                    label: 'Helvetica Bold (estándar PDF)',           css: 'Helvetica, Arial, sans-serif',    weight: 'bold',   style: 'normal', group: 'Estándar PDF' },
    { value: 'TimesRoman',                       label: 'Times Roman (estándar PDF)',              css: "'Times New Roman', serif",        weight: 'normal', style: 'normal', group: 'Estándar PDF' },
    { value: 'TimesBold',                        label: 'Times Bold (estándar PDF)',               css: "'Times New Roman', serif",        weight: 'bold',   style: 'normal', group: 'Estándar PDF' },
    { value: 'TimesItalic',                      label: 'Times Italic (estándar PDF)',             css: "'Times New Roman', serif",        weight: 'normal', style: 'italic', group: 'Estándar PDF' },
    { value: 'TimesBoldItalic',                  label: 'Times Bold Italic (estándar PDF)',        css: "'Times New Roman', serif",        weight: 'bold',   style: 'italic', group: 'Estándar PDF' },
];

const FONT_GROUPS = [...new Set(FONT_OPTIONS.map(f => f.group))];

const INITIAL_NAME_PCT = { x: 0.50, y: 0.35 };
const INITIAL_QR_PCT   = { x: 0.78, y: 0.72 };
const INITIAL_DATE_PCT = { x: 0.50, y: 0.55 };

/**
 * CreateCertificateTemplatePage
 *
 * SISTEMA DE COORDENADAS (proporcional):
 * ─────────────────────────────────────────────────────────────────────────────
 * Los Draggables usan modo NO CONTROLADO (defaultPosition).
 * react-draggable gestiona su posición internamente → sin problemas de
 * batching de React state que causaban coordenadas incorrectas.
 *
 * FIX DEL BUG DE COORDENADAS:
 * ─────────────────────────────────────────────────────────────────────────────
 * Problema: defaultPosition se calculaba cuando containerRef tenía height=0
 * (canvas aún renderizando). Los bounds con height=0 permitían Y negativos.
 *
 * Solución:
 *   1. Los Draggables NO montan hasta que nameDefaultPos/qrDefaultPos están listos.
 *   2. useLayoutEffect (corre DESPUÉS del paint, offsetHeight garantizado correcto)
 *      calcula las posiciones iniciales en píxeles CSS y las guarda en estado.
 *   3. Draggable monta con esas posiciones como defaultPosition.
 *   4. onStop lee data.x/data.y (posición absoluta interna de react-draggable)
 *      y la convierte en proporción dividiendo por el tamaño actual del contenedor.
 */
export const CreateCertificateTemplatePage: React.FC<Props> = ({ gateway }) => {
    const { token } = useAuth();
    const navigate = useNavigate();

    // ── Paso 1 ────────────────────────────────────────────────────────────────
    const [formName, setFormName]               = useState('');
    const [formAbbr, setFormAbbr]               = useState('');
    const [formPaperFormat, setFormPaperFormat] = useState('A4 Vertical');
    const [file, setFile]                       = useState<File | null>(null);
    const [template, setTemplate]               = useState<CertificateTemplate | null>(null);

    // ── Refs ──────────────────────────────────────────────────────────────────
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nameNodeRef  = useRef<HTMLDivElement>(null);
    const qrNodeRef    = useRef<HTMLDivElement>(null);
    const dateNodeRef  = useRef<HTMLDivElement>(null);

    const [pdfDims, setPdfDims] = useState({ w: 0, h: 0 });

    // Posiciones iniciales en píxeles CSS para defaultPosition de Draggable.
    // null = aún no calculadas (Draggables no montan hasta que tengan valor).
    const [nameDefaultPos, setNameDefaultPos] = useState<{ x: number; y: number } | null>(null);
    const [qrDefaultPos,   setQrDefaultPos]   = useState<{ x: number; y: number } | null>(null);
    const [dateDefaultPos, setDateDefaultPos] = useState<{ x: number; y: number } | null>(null);

    // Proporciones (0–1): lo que se convierte a puntos PDF al guardar.
    // Se actualizan en onStop.
    const [namePct, setNamePct] = useState(INITIAL_NAME_PCT);
    const [qrPct,   setQrPct]   = useState(INITIAL_QR_PCT);
    const [datePct, setDatePct] = useState(INITIAL_DATE_PCT);

    // ── Estilo ────────────────────────────────────────────────────────────────
    const [fontFamily, setFontFamily] = useState('GreatVibes-Regular');
    const [fontSize, setFontSize]     = useState(36);
    const [nameColor, setNameColor]   = useState('#1a1a1a');
    const [nameAlign, setNameAlign]   = useState<'left' | 'center'>('left');
    const [qrSize, setQrSize]         = useState(90);
    // Fecha
    const [showDate, setShowDate]             = useState(true);
    const [dateFontSize, setDateFontSize]     = useState(18);
    const [dateColor, setDateColor]           = useState('#1a1a1a');
    const [dateFontFamily, setDateFontFamily] = useState('Helvetica');
    const [dateAlign, setDateAlign]           = useState<'left' | 'center'>('left');

    // ── UI ────────────────────────────────────────────────────────────────────
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const selectedFont = FONT_OPTIONS.find(f => f.value === fontFamily) ?? FONT_OPTIONS[0];

    // ── Renderizar PDF ────────────────────────────────────────────────────────
    const renderPdf = useCallback(async (pdfFile: File) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        const pdf  = await pdfjsLib.getDocument({ data: await pdfFile.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(780 / viewport.width, 1.5);
        const sv = page.getViewport({ scale });

        canvas.width  = sv.width;
        canvas.height = sv.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: sv, canvas }).promise;

        // IMPORTANTE: setCanvasRendered dispara useLayoutEffect, que lee
        // offsetHeight DESPUÉS del paint (cuando el canvas ya tiene dimensiones
        // CSS reales) y fija las defaultPositions.
        setCanvasRendered(r => r + 1);
    }, []);

    // Contador que sube 1 cada vez que renderPdf termina.
    // useLayoutEffect reacciona a él para fijar las posiciones.
    const [canvasRendered, setCanvasRendered] = useState(0);

    useEffect(() => {
        if (file && template) renderPdf(file).catch(console.error);
    }, [file, template, renderPdf]);

    useEffect(() => {
        if (template) setPdfDims({ w: template.pageWidth, h: template.pageHeight });
    }, [template]);

    /**
     * useLayoutEffect: corre SÍNCRONO después del paint.
     * En este punto el canvas ya tiene height real (CSS layout computado).
     * Seteamos las defaultPositions en píxeles → los Draggables montan correctamente.
     */
    useLayoutEffect(() => {
        if (canvasRendered === 0 || !containerRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        if (w === 0 || h === 0) return;
        setNameDefaultPos({ x: INITIAL_NAME_PCT.x * w, y: INITIAL_NAME_PCT.y * h });
        setQrDefaultPos({   x: INITIAL_QR_PCT.x   * w, y: INITIAL_QR_PCT.y   * h });
        setDateDefaultPos({ x: INITIAL_DATE_PCT.x * w, y: INITIAL_DATE_PCT.y * h });
    }, [canvasRendered]);

    // ── Validación del archivo PDF ────────────────────────────────────────────
    // Se ejecuta en el onChange del input, antes de subir.
    // Usa pdfjs-dist (ya importado) para leer dimensiones sin hacer ninguna
    // petición HTTP — todo sucede en el navegador.
    const validateFile = async (selectedFile: File): Promise<string | null> => {
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            return `El archivo pesa ${(selectedFile.size / 1024 / 1024).toFixed(1)} MB. El máximo permitido es ${MAX_FILE_SIZE_MB} MB.`;
        }

        const format = PAPER_FORMATS.find(f => f.value === formPaperFormat);
        if (!format) return null;

        const pdf = await pdfjsLib.getDocument({ data: await selectedFile.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const { width, height } = page.getViewport({ scale: 1 });

        // Cada opción ya declara su orientación explícitamente,
        // por lo que validamos coincidencia exacta (con tolerancia).
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

    // ── Paso 1: subir plantilla ───────────────────────────────────────────────
    const handleUpload = async () => {
        if (!token || !formName || !formAbbr || !file) return;
        setUploading(true);
        setError(null);
        try {
            const result = await gateway.uploadTemplate(formName, formAbbr, formPaperFormat, file, token);
            setTemplate(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al subir la plantilla');
        } finally {
            setUploading(false);
        }
    };

    // ── Escala display ────────────────────────────────────────────────────────
    const getDisplayScale = (): number => {
        if (!containerRef.current || !pdfDims.w) return 1;
        return containerRef.current.offsetWidth / pdfDims.w;
    };
    const displayFontSize = () => Math.max(8,  Math.round(fontSize * getDisplayScale()));
    const displayQrSize   = () => Math.max(20, Math.round(qrSize   * getDisplayScale()));

    // ── Paso 2: guardar ───────────────────────────────────────────────────────
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
                nameAlign,
                qrPositionX:   qrPct.x * pdfDims.w,
                qrPositionY:   qrPct.y * pdfDims.h,
                qrSize,
                showDate,
                datePositionX: datePct.x * pdfDims.w,
                datePositionY: datePct.y * pdfDims.h,
                dateFontSize,
                dateColor,
                dateFontFamily,
                dateAlign,
            }, token);
            navigate('/admin/certificados');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar posiciones');
        } finally {
            setSaving(false);
        }
    };

    // ── Callbacks de Draggable (modo NO controlado) ───────────────────────────
    // data.x / data.y = posición absoluta del elemento desde la esquina
    // superior-izquierda del contenedor padre, en píxeles CSS.
    // react-draggable los acumula internamente sin depender del state de React.
    /**
     * Fábrica de handlers onStop para los Draggables.
     * align: si es 'center', guardamos el CENTRO del elemento (data.x + width/2)
     *        como ancla X, en vez del borde izquierdo.
     * El PDF generator luego hace: drawX = anchorX - textWidth/2
     */
    const makeOnStop = (
        align: 'left' | 'center',
        nodeRef: React.RefObject<HTMLDivElement | null>,
        setPct: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
    ) => (_: unknown, data: { x: number; y: number }) => {
        if (!containerRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        const anchorX = align === 'center'
            ? data.x + (nodeRef.current?.offsetWidth ?? 0) / 2
            : data.x + DRAGGABLE_PADDING_X;
        setPct({
            x: Math.max(0, Math.min(1, anchorX / w)),
            y: Math.max(0, Math.min(1, data.y / h)),
        });
    };

    const onNameStop = makeOnStop(nameAlign, nameNodeRef, setNamePct);
    const onQrStop   = makeOnStop('left',     qrNodeRef,   setQrPct);
    const onDateStop = makeOnStop(dateAlign,  dateNodeRef,  setDatePct);

    const draggablesReady = nameDefaultPos !== null && qrDefaultPos !== null && dateDefaultPos !== null;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="admin-page">
            <Link to="/admin/certificados" className="back-link">← Volver al Panel de Certificados</Link>
            <div className="admin-header">
                <h1>Nueva Plantilla de Certificado</h1>
                <p>Sube el PDF en blanco y posiciona el nombre y el QR arrastrándolos.</p>
            </div>

            {!template ? (
                /* ── PASO 1 ──────────────────────────────────────────────── */
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
                /* ── PASO 2 ──────────────────────────────────────────────── */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

                    <div>
                        <div style={{
                            background: 'var(--bg-card)', border: '2px solid var(--border)',
                            borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem',
                        }}>
                            <p style={{ textAlign: 'center', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                {draggablesReady ? 'Arrastra cada elemento a su posición' : 'Cargando PDF…'}
                            </p>

                            {/* position:relative es el origen de coordenadas de los Draggables */}
                            <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                <canvas ref={canvasRef} style={{ display: 'block', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', pointerEvents: 'none' }} />

                                {/* Los Draggables montan solo cuando nameDefaultPos/qrDefaultPos
                                    tienen valores calculados por useLayoutEffect (canvas ya renderizado).
                                    Esto garantiza bounds correctos y posición inicial precisa. */}
                                {draggablesReady && (
                                    <>
                                        <Draggable
                                            nodeRef={nameNodeRef}
                                            bounds="parent"
                                            defaultPosition={nameDefaultPos!}
                                            onStop={onNameStop}
                                        >
                                            <div ref={nameNodeRef} style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                cursor: 'grab',
                                                userSelect: 'none',
                                                padding: `0 ${DRAGGABLE_PADDING_X}px`,
                                                background: 'rgba(232, 67, 147, 0.10)',
                                                border: '1.5px dashed #e84393',
                                                borderRadius: '3px',
                                                fontFamily: selectedFont.css,
                                                fontWeight: selectedFont.weight,
                                                fontStyle: selectedFont.style,
                                                fontSize: `${displayFontSize()}px`,
                                                color: nameColor,
                                                whiteSpace: 'nowrap',
                                                lineHeight: 1,
                                                // En modo centro: marcamos visualmente el eje central
                                                // con una línea punteada vertical en el medio del elemento
                                                ...(nameAlign === 'center' && {
                                                    backgroundImage: 'linear-gradient(#e84393 1px, transparent 1px)',
                                                    backgroundSize: '1px 4px',
                                                    backgroundPosition: '50% 0',
                                                    backgroundRepeat: 'repeat-y',
                                                }),
                                            }}>
                                                Ana García
                                            </div>
                                        </Draggable>

                                        <Draggable
                                            nodeRef={qrNodeRef}
                                            bounds="parent"
                                            defaultPosition={qrDefaultPos!}
                                            onStop={onQrStop}
                                        >
                                            <div ref={qrNodeRef} style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                cursor: 'grab',
                                                userSelect: 'none',
                                                border: '1.5px dashed #d4a574',
                                                background: 'rgba(212, 165, 116, 0.08)',
                                                width:  `${displayQrSize()}px`,
                                                height: `${displayQrSize()}px`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                            }}>
                                                <QRCodeSVG value="https://marsnailsacademy.com/certificados/ejemplo" size={displayQrSize()} />
                                            </div>
                                        </Draggable>

                                        {showDate && (
                                            <Draggable
                                                nodeRef={dateNodeRef}
                                                bounds="parent"
                                                defaultPosition={dateDefaultPos!}
                                                onStop={onDateStop}
                                            >
                                                <div ref={dateNodeRef} style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    cursor: 'grab',
                                                    userSelect: 'none',
                                                    padding: `0 ${DRAGGABLE_PADDING_X}px`,
                                                    background: 'rgba(100, 180, 100, 0.10)',
                                                    border: '1.5px dashed #4caf50',
                                                    borderRadius: '3px',
                                                    fontFamily: (FONT_OPTIONS.find(f => f.value === dateFontFamily) ?? FONT_OPTIONS[0]).css,
                                                    fontWeight: (FONT_OPTIONS.find(f => f.value === dateFontFamily) ?? FONT_OPTIONS[0]).weight,
                                                    fontStyle:  (FONT_OPTIONS.find(f => f.value === dateFontFamily) ?? FONT_OPTIONS[0]).style,
                                                    fontSize: `${Math.max(8, Math.round(dateFontSize * getDisplayScale()))}px`,
                                                    color: dateColor,
                                                    whiteSpace: 'nowrap',
                                                    lineHeight: 1,
                                                    ...(dateAlign === 'center' && {
                                                        backgroundImage: 'linear-gradient(#4caf50 1px, transparent 1px)',
                                                        backgroundSize: '1px 4px',
                                                        backgroundPosition: '50% 0',
                                                        backgroundRepeat: 'repeat-y',
                                                    }),
                                                }}>
                                                    11/03/2026
                                                </div>
                                            </Draggable>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
                            <span><span style={{ color: '#e84393', fontWeight: 700 }}>━ ━</span> Nombre del alumno</span>
                            <span><span style={{ color: '#d4a574', fontWeight: 700 }}>━ ━</span> Código QR</span>
                            {showDate && <span><span style={{ color: '#4caf50', fontWeight: 700 }}>━ ━</span> Fecha</span>}
                        </div>
                    </div>

                    {/* Panel de opciones */}
                    <div className="admin-card">
                        <h3 style={{ marginBottom: '1.25rem' }}>Opciones de estilo</h3>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Tipo de letra</label>
                            <select className="form-input" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                                {FONT_GROUPS.map(group => (
                                    <optgroup key={group} label={group}>
                                        {FONT_OPTIONS.filter(f => f.group === group).map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <p style={{
                                fontFamily: selectedFont.css, fontWeight: selectedFont.weight,
                                fontStyle: selectedFont.style, fontSize: '1.3rem',
                                marginTop: '0.5rem', color: nameColor,
                                background: 'var(--bg-secondary, #f5f5f5)',
                                padding: '0.4rem 0.75rem', borderRadius: '4px', textAlign: 'center',
                            }}>
                                Ana García
                            </p>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Posición del nombre</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {(['left', 'center'] as const).map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setNameAlign(opt)}
                                        style={{
                                            flex: 1,
                                            padding: '0.4rem',
                                            border: `2px solid ${nameAlign === opt ? 'var(--primary)' : 'var(--border)'}`,
                                            borderRadius: '6px',
                                            background: nameAlign === opt ? 'rgba(232,67,147,0.08)' : 'transparent',
                                            color: nameAlign === opt ? 'var(--primary)' : 'var(--text-muted)',
                                            fontWeight: nameAlign === opt ? 700 : 400,
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {opt === 'left' ? '⇥ Izquierda' : '⇔ Centrado'}
                                    </button>
                                ))}
                            </div>
                            {nameAlign === 'center' && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                    El punto donde sueltes el elemento será el centro del nombre, sin importar su longitud.
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Tamaño de fuente</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input type="range" min={8} max={120} step={1} value={fontSize}
                                    onChange={e => setFontSize(Number(e.target.value))}
                                    style={{ flex: 1, accentColor: 'var(--primary)' }} />
                                <input type="number" min={8} max={120} value={fontSize}
                                    onChange={e => setFontSize(Math.min(120, Math.max(8, Number(e.target.value))))}
                                    style={{ width: '54px', textAlign: 'center', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pt</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label">Color del nombre</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input type="color" value={nameColor} onChange={e => setNameColor(e.target.value)}
                                    style={{ width: '44px', height: '36px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }} />
                                <input type="text" className="form-input" value={nameColor}
                                    onChange={e => setNameColor(e.target.value)}
                                    style={{ fontFamily: 'monospace', flex: 1 }} />
                            </div>
                        </div>

                        <hr style={{ marginBottom: '1.25rem', borderColor: 'var(--border)' }} />

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Tamaño del QR</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input type="range" min={30} max={250} step={5} value={qrSize}
                                    onChange={e => setQrSize(Number(e.target.value))}
                                    style={{ flex: 1, accentColor: 'var(--gold, #d4a574)' }} />
                                <input type="number" min={30} max={250} value={qrSize}
                                    onChange={e => setQrSize(Math.min(250, Math.max(30, Number(e.target.value))))}
                                    style={{ width: '54px', textAlign: 'center', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pt</span>
                            </div>
                        </div>

                        <hr style={{ marginBottom: '1.25rem', borderColor: 'var(--border)' }} />

                        {/* ── Fecha de emisión ── */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                                <input type="checkbox" checked={showDate} onChange={e => setShowDate(e.target.checked)}
                                    style={{ accentColor: '#4caf50', width: '16px', height: '16px' }} />
                                Mostrar fecha de emisión
                            </label>
                        </div>

                        {showDate && (
                            <>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="form-label">Tipo de letra (fecha)</label>
                                    <select className="form-input" value={dateFontFamily} onChange={e => setDateFontFamily(e.target.value)}>
                                        {FONT_GROUPS.map(group => (
                                            <optgroup key={group} label={group}>
                                                {FONT_OPTIONS.filter(f => f.group === group).map(f => (
                                                    <option key={f.value} value={f.value}>{f.label}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="form-label">Posición de la fecha</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {(['left', 'center'] as const).map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => setDateAlign(opt)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.4rem',
                                                    border: `2px solid ${dateAlign === opt ? '#4caf50' : 'var(--border)'}`,
                                                    borderRadius: '6px',
                                                    background: dateAlign === opt ? 'rgba(76,175,80,0.08)' : 'transparent',
                                                    color: dateAlign === opt ? '#4caf50' : 'var(--text-muted)',
                                                    fontWeight: dateAlign === opt ? 700 : 400,
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {opt === 'left' ? '⇥ Izquierda' : '⇔ Centrado'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="form-label">Tamaño de fuente (fecha)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input type="range" min={6} max={80} step={1} value={dateFontSize}
                                            onChange={e => setDateFontSize(Number(e.target.value))}
                                            style={{ flex: 1, accentColor: '#4caf50' }} />
                                        <input type="number" min={6} max={80} value={dateFontSize}
                                            onChange={e => setDateFontSize(Math.min(80, Math.max(6, Number(e.target.value))))}
                                            style={{ width: '54px', textAlign: 'center', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pt</span>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Color de la fecha</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input type="color" value={dateColor} onChange={e => setDateColor(e.target.value)}
                                            style={{ width: '44px', height: '36px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }} />
                                        <input type="text" className="form-input" value={dateColor}
                                            onChange={e => setDateColor(e.target.value)}
                                            style={{ fontFamily: 'monospace', flex: 1 }} />
                                    </div>
                                </div>
                            </>
                        )}

                        {error && <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}

                        <button className="btn-primary" onClick={handleSave}
                            disabled={saving || !draggablesReady} style={{ width: '100%' }}>
                            {saving ? 'Guardando…' : 'Guardar Plantilla'}
                        </button>

                        <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                            <span>PDF: {ptsToMm(pdfDims.w)}×{ptsToMm(pdfDims.h)} mm ({ptsToPx(pdfDims.w)}×{ptsToPx(pdfDims.h)} px a 300 DPI)</span><br />
                            <span>Formato: {template.paperFormat} · Calidad de impresión</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
