import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Draggable from 'react-draggable';
import { QRCodeSVG } from 'qrcode.react';
// Build legacy: el moderno usa Uint8Array.toHex, que navegadores no actualizados no tienen.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { CertificateGateway, CertificateTemplate, NameStyle, QrStyle, DateStyle } from '../gateways/CertificateGateway';
import { ptsToMm, ptsToPx } from '../lib/pdf-units';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

// ── Catálogo de fuentes ─────────────────────────────────────────────────────
// Las fuentes "estándar PDF" son built-in de pdf-lib (no requieren TTF).
// Las custom viven en apps/backend/src/certificates/fonts/ y se sirven desde el dist
// del backend (configurado en nest-cli.json assets).

type FontOption = {
    value: string;
    label: string;
    css: string;
    weight: string;
    style: string;
    group: string;
};

const FONT_OPTIONS: FontOption[] = [
    // Caligráficas
    { value: 'GreatVibes-Regular',               label: 'Great Vibes (caligráfica elegante)',      css: "'Great Vibes', cursive",              weight: 'normal', style: 'normal', group: 'Caligráficas' },
    { value: 'Allura-Regular',                   label: 'Allura (script fino)',                    css: "'Allura', cursive",                   weight: 'normal', style: 'normal', group: 'Caligráficas' },
    { value: 'Sacramento-Regular',               label: 'Sacramento (caligráfica delgada)',        css: "'Sacramento', cursive",               weight: 'normal', style: 'normal', group: 'Caligráficas' },
    { value: 'DancingScript-Bold',               label: 'Dancing Script Bold (script moderno)',    css: "'Dancing Script', cursive",           weight: '700',    style: 'normal', group: 'Caligráficas' },
    { value: 'Pacifico-Regular',                 label: 'Pacifico (redondeada festiva)',           css: "'Pacifico', cursive",                 weight: 'normal', style: 'normal', group: 'Caligráficas' },
    // Serif elegante
    { value: 'Cinzel-Regular',                   label: 'Cinzel Regular (romana mayúsculas)',      css: "'Cinzel', serif",                     weight: '400',    style: 'normal', group: 'Serif elegante' },
    { value: 'Cinzel-Bold',                      label: 'Cinzel Bold (romana mayúsculas)',         css: "'Cinzel', serif",                     weight: '700',    style: 'normal', group: 'Serif elegante' },
    { value: 'PlayfairDisplay-Regular',          label: 'Playfair Display (serif lujosa)',         css: "'Playfair Display', serif",           weight: '400',    style: 'normal', group: 'Serif elegante' },
    { value: 'PlayfairDisplay-BoldItalic',       label: 'Playfair Display Bold Italic',           css: "'Playfair Display', serif",           weight: '700',    style: 'italic', group: 'Serif elegante' },
    { value: 'CormorantGaramond-SemiBold',       label: 'Cormorant Garamond SemiBold',            css: "'Cormorant Garamond', serif",         weight: '600',    style: 'normal', group: 'Serif elegante' },
    { value: 'CormorantGaramond-SemiBoldItalic', label: 'Cormorant Garamond SemiBold Italic',     css: "'Cormorant Garamond', serif",         weight: '600',    style: 'italic', group: 'Serif elegante' },
    { value: 'LibreBaskerville-Regular',         label: 'Libre Baskerville Regular',              css: "'Libre Baskerville', serif",          weight: '400',    style: 'normal', group: 'Serif elegante' },
    { value: 'LibreBaskerville-Bold',            label: 'Libre Baskerville Bold',                 css: "'Libre Baskerville', serif",          weight: '700',    style: 'normal', group: 'Serif elegante' },
    // Sans-serif
    { value: 'Montserrat-Regular',               label: 'Montserrat Regular',                     css: "'Montserrat', sans-serif",            weight: '400',    style: 'normal', group: 'Sans-serif' },
    { value: 'Montserrat-Bold',                  label: 'Montserrat Bold',                        css: "'Montserrat', sans-serif",            weight: '700',    style: 'normal', group: 'Sans-serif' },
    { value: 'Raleway-Regular',                  label: 'Raleway Regular',                        css: "'Raleway', sans-serif",               weight: '400',    style: 'normal', group: 'Sans-serif' },
    { value: 'Raleway-Bold',                     label: 'Raleway Bold',                           css: "'Raleway', sans-serif",               weight: '700',    style: 'normal', group: 'Sans-serif' },
    { value: 'NunitoSans-Regular',               label: 'Nunito Sans Regular',                    css: "'Nunito Sans', sans-serif",           weight: '400',    style: 'normal', group: 'Sans-serif' },
    // Estándar PDF
    { value: 'Helvetica',                        label: 'Helvetica (estándar PDF)',                css: 'Helvetica, Arial, sans-serif',        weight: 'normal', style: 'normal', group: 'Estándar PDF' },
    { value: 'HelveticaBold',                    label: 'Helvetica Bold (estándar PDF)',           css: 'Helvetica, Arial, sans-serif',        weight: 'bold',   style: 'normal', group: 'Estándar PDF' },
    { value: 'TimesRoman',                       label: 'Times Roman (estándar PDF)',              css: "'Times New Roman', serif",            weight: 'normal', style: 'normal', group: 'Estándar PDF' },
    { value: 'TimesBold',                        label: 'Times Bold (estándar PDF)',               css: "'Times New Roman', serif",            weight: 'bold',   style: 'normal', group: 'Estándar PDF' },
    { value: 'TimesItalic',                      label: 'Times Italic (estándar PDF)',             css: "'Times New Roman', serif",            weight: 'normal', style: 'italic', group: 'Estándar PDF' },
    { value: 'TimesBoldItalic',                  label: 'Times Bold Italic (estándar PDF)',        css: "'Times New Roman', serif",            weight: 'bold',   style: 'italic', group: 'Estándar PDF' },
];

const FONT_GROUPS = [...new Set(FONT_OPTIONS.map(f => f.group))];

type MarkerTone = 'name' | 'qr' | 'date';

/** Deslizador + número + "pt", con el color del elemento al que afecta. */
const RangeField = ({ label, min, max, step, value, onChange, tone }: {
    label: string; min: number; max: number; step: number; value: number;
    onChange: (value: number) => void; tone: MarkerTone;
}) => (
    <div className="form-group">
        <label>{label}</label>
        <div className={`design-range design-range--${tone}`}>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))} aria-label={label} />
            <input type="number" min={min} max={max} value={value}
                onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
                className="design-range__number" aria-label={`${label} (pt)`} />
            <span className="design-range__unit">pt</span>
        </div>
    </div>
);

/** Selector de color + código hex editable. */
const ColorField = ({ label, value, onChange }: {
    label: string; value: string; onChange: (value: string) => void;
}) => (
    <div className="form-group">
        <label>{label}</label>
        <div className="design-color">
            <input type="color" value={value} onChange={e => onChange(e.target.value)}
                className="design-color__swatch" aria-label={label} />
            <input type="text" value={value} onChange={e => onChange(e.target.value)}
                className="design-color__hex" aria-label={`${label} (hex)`} />
        </div>
    </div>
);

/** Izquierda / Centrado como botones segmentados. */
const AlignToggle = ({ label, value, onChange, tone }: {
    label: string; value: 'left' | 'center'; onChange: (value: 'left' | 'center') => void; tone: MarkerTone;
}) => (
    <div className="form-group">
        <label>{label}</label>
        <div className={`design-align design-align--${tone}`} role="group" aria-label={label}>
            {(['left', 'center'] as const).map(opt => (
                <button key={opt} type="button" onClick={() => onChange(opt)} aria-pressed={value === opt}>
                    {opt === 'left' ? '⇥ Izquierda' : '⇔ Centrado'}
                </button>
            ))}
        </div>
    </div>
);

/** Tipo de letra agrupado por familia. */
const FontSelect = ({ label, value, onChange }: {
    label: string; value: string; onChange: (value: string) => void;
}) => (
    <div className="form-group">
        <label>{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)}>
            {FONT_GROUPS.map(group => (
                <optgroup key={group} label={group}>
                    {FONT_OPTIONS.filter(f => f.group === group).map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </optgroup>
            ))}
        </select>
    </div>
);

// Posiciones iniciales por defecto (modo creación) — proporcionales al canvas.
const INITIAL_NAME_PCT = { x: 0.50, y: 0.35 };
const INITIAL_QR_PCT   = { x: 0.78, y: 0.72 };
const INITIAL_DATE_PCT = { x: 0.50, y: 0.55 };

export interface TemplateDesignInitialStyles {
    nameStyle: NameStyle;
    qrStyle: QrStyle;
    dateStyle: DateStyle;
}

export interface TemplateDesignPickerProps {
    /**
     * Plantilla ya persistida en backend (con id, pageWidth, pageHeight, paperFormat).
     * El picker SOLO edita el diseño visual — no crea ni renombra plantillas.
     */
    template: CertificateTemplate;

    /**
     * Bytes del PDF base que el picker va a renderizar como canvas de fondo.
     * Puede venir de un upload reciente (File) o de un fetch al backend (Blob).
     * El picker no sabe ni le importa de dónde salieron — solo necesita los bytes.
     */
    pdfSource: File | Blob;

    /**
     * Estilos iniciales con los que arrancar el picker.
     *
     *   - Si se proveen → modo edición: el picker precarga estas posiciones,
     *     fuentes, colores y alineaciones del backend.
     *   - Si NO se proveen → modo creación: el picker arranca con defaults
     *     visuales centrados (posiciones proporcionales hardcoded).
     *
     * Nota: en modo creación NO leemos de template.nameStyle/qrStyle/dateStyle
     * porque la entidad arranca con DEFAULT_NAME_STYLE = {positionX: 0, positionY: 0, ...}
     * que dejaría los Draggables apilados en la esquina superior-izquierda.
     * Los defaults visuales del picker son más amigables para empezar.
     */
    initialStyles?: TemplateDesignInitialStyles;

    gateway: CertificateGateway;

    /**
     * Callback que el picker invoca tras guardar exitosamente el diseño.
     * Típicamente: navegar a /admin/certificados.
     */
    onSaved: () => void;

    /**
     * Callback opcional para errores de guardado. Si no se provee, el picker
     * los muestra en su propio bloque de error inline.
     */
    onError?: (message: string) => void;
}

/**
 * TemplateDesignPicker — editor visual reutilizable del diseño completo
 * de una plantilla de certificado.
 *
 * Edita TODO el diseño visual:
 *   - Posiciones del nombre, QR y fecha (drag & drop)
 *   - Tipografía, tamaño, color y alineación del nombre
 *   - Tamaño del QR
 *   - Visibilidad, tipografía, tamaño, color y alineación de la fecha
 *
 * El nombre del componente es "DesignPicker" y NO "PositionsPicker" porque
 * editar solo coordenadas sería una mentira sobre lo que el componente hace.
 *
 * Extraído de la fase 2 de CreateCertificateTemplatePage para que el flujo de
 * EDICIÓN del diseño de una plantilla existente pueda reutilizar exactamente
 * la misma UI sin duplicar 500 líneas de código. Crear y editar comparten
 * el mismo componente: garantía estructural de que ambos flujos tienen las
 * mismas capacidades, hoy y mañana.
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
export const TemplateDesignPicker: React.FC<TemplateDesignPickerProps> = ({
    template,
    pdfSource,
    initialStyles,
    gateway,
    onSaved,
    onError,
}) => {
    // ── Refs ──────────────────────────────────────────────────────────────────
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nameNodeRef  = useRef<HTMLDivElement>(null);
    const qrNodeRef    = useRef<HTMLDivElement>(null);
    const dateNodeRef  = useRef<HTMLDivElement>(null);
    const viewportRef  = useRef<HTMLDivElement>(null);

    // ── Posiciones (proporcionales 0-1) ───────────────────────────────────────
    // Derivamos las pcts iniciales:
    //   - Si initialStyles está presente → calcular pct = positionX / pageWidth
    //   - Si no → usar las constantes hardcoded de defaults visuales
    const initialNamePct = initialStyles
        ? { x: initialStyles.nameStyle.positionX / template.pageWidth, y: initialStyles.nameStyle.positionY / template.pageHeight }
        : INITIAL_NAME_PCT;
    const initialQrPct = initialStyles
        ? { x: initialStyles.qrStyle.positionX / template.pageWidth, y: initialStyles.qrStyle.positionY / template.pageHeight }
        : INITIAL_QR_PCT;
    const initialDatePct = initialStyles
        ? { x: initialStyles.dateStyle.positionX / template.pageWidth, y: initialStyles.dateStyle.positionY / template.pageHeight }
        : INITIAL_DATE_PCT;

    const [namePct, setNamePct] = useState(initialNamePct);
    const [qrPct,   setQrPct]   = useState(initialQrPct);
    const [datePct, setDatePct] = useState(initialDatePct);

    // ── Estilos ───────────────────────────────────────────────────────────────
    const [fontFamily,     setFontFamily]     = useState(initialStyles?.nameStyle.fontFamily ?? 'GreatVibes-Regular');
    const [fontSize,       setFontSize]       = useState(initialStyles?.nameStyle.fontSize   ?? 36);
    const [nameColor,      setNameColor]      = useState(initialStyles?.nameStyle.color      ?? '#1a1a1a'); // design-tokens: allow — se imprime en el PDF
    const [nameAlign,      setNameAlign]      = useState<'left' | 'center'>(initialStyles?.nameStyle.align ?? 'left');
    const [qrSize,         setQrSize]         = useState(initialStyles?.qrStyle.size         ?? 90);
    const [qrFgColor,     setQrFgColor]     = useState(initialStyles?.qrStyle.foregroundColor ?? '#000000'); // design-tokens: allow — se imprime en el PDF
    const [qrBgColor,     setQrBgColor]     = useState(initialStyles?.qrStyle.backgroundColor ?? '#ffffff'); // design-tokens: allow — se imprime en el PDF
    const [dateFontSize,   setDateFontSize]   = useState(initialStyles?.dateStyle.fontSize   ?? 18);
    const [dateColor,      setDateColor]      = useState(initialStyles?.dateStyle.color      ?? '#1a1a1a'); // design-tokens: allow — se imprime en el PDF
    const [dateFontFamily, setDateFontFamily] = useState(initialStyles?.dateStyle.fontFamily ?? 'Helvetica');
    const [dateAlign,      setDateAlign]      = useState<'left' | 'center'>(initialStyles?.dateStyle.align ?? 'left');

    // ── Posiciones iniciales en píxeles para los Draggables ───────────────────
    const [nameDefaultPos, setNameDefaultPos] = useState<{ x: number; y: number } | null>(null);
    const [qrDefaultPos,   setQrDefaultPos]   = useState<{ x: number; y: number } | null>(null);
    const [dateDefaultPos, setDateDefaultPos] = useState<{ x: number; y: number } | null>(null);

    // ── Zoom ──────────────────────────────────────────────────────────────────
    const [zoomLevel, setZoomLevel] = useState(1.2);
    const [viewportWidth, setViewportWidth] = useState(0);
    const canvasNaturalHeightRef = useRef(0);

    // ── UI ────────────────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState<string | null>(null);
    const [canvasRendered, setCanvasRendered] = useState(0);

    const selectedFont = FONT_OPTIONS.find(f => f.value === fontFamily) ?? FONT_OPTIONS[0];
    const selectedDateFont = FONT_OPTIONS.find(f => f.value === dateFontFamily) ?? FONT_OPTIONS[0];
    const pdfDims = { w: template.pageWidth, h: template.pageHeight };

    // ── Renderizar PDF ────────────────────────────────────────────────────────
    // React 18 StrictMode ejecuta useEffect dos veces en desarrollo.
    // pdfjs no permite dos render() concurrentes en el mismo canvas.
    // Solución: el cleanup del useEffect cancela el render anterior
    // ANTES de que React invoque el efecto de nuevo.
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        let cancelled = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let renderTask: any = null;

        (async () => {
            const pdf  = await pdfjsLib.getDocument({ data: await pdfSource.arrayBuffer() }).promise;
            if (cancelled) return;
            const page = await pdf.getPage(1);
            if (cancelled) return;
            const viewport = page.getViewport({ scale: 1 });
            const scale = Math.min(780 / viewport.width, 1.5);
            const sv = page.getViewport({ scale });

            canvas.width  = sv.width;
            canvas.height = sv.height;
            renderTask = page.render({ canvasContext: canvas.getContext('2d')!, viewport: sv, canvas });
            await renderTask.promise;
            if (!cancelled) setCanvasRendered(r => r + 1);
        })().catch((err: unknown) => {
            if (!cancelled) setError(err instanceof Error ? err.message : 'Error al renderizar el PDF');
        });

        return () => {
            cancelled = true;
            if (renderTask) {
                try { renderTask.cancel(); } catch { /* ya terminó */ }
            }
        };
    }, [pdfSource]);

    // Captura el ancho del viewport una vez al montar.
    useLayoutEffect(() => {
        if (viewportRef.current && viewportWidth === 0) {
            setViewportWidth(viewportRef.current.offsetWidth);
        }
    }, [viewportWidth]);

    // useLayoutEffect: corre síncrono después del paint, cuando el canvas ya
    // tiene dimensiones reales. Calcula las posiciones absolutas en píxeles
    // a partir de las pcts (que ya están seedeadas con initialStyles o defaults).
    useLayoutEffect(() => {
        if (canvasRendered === 0 || !containerRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        if (w === 0 || h === 0) return;
        canvasNaturalHeightRef.current = h;
        setNameDefaultPos({ x: namePct.x * w, y: namePct.y * h });
        setQrDefaultPos({   x: qrPct.x   * w, y: qrPct.y   * h });
        setDateDefaultPos({ x: datePct.x * w, y: datePct.y * h });
        // Solo se ejecuta una vez al primer render del canvas — las pcts
        // iniciales están seedeadas en useState, no queremos reseteo cuando
        // el admin arrastra después.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasRendered]);

    // ── Escala display ────────────────────────────────────────────────────────
    const getDisplayScale = (): number => {
        if (!containerRef.current || !pdfDims.w) return 1;
        return containerRef.current.offsetWidth / pdfDims.w;
    };
    const displayFontSize = () => Math.max(8,  Math.round(fontSize * getDisplayScale()));
    const displayQrSize   = () => Math.max(20, Math.round(qrSize   * getDisplayScale()));

    // ── Guardar ───────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await gateway.updateTemplateDesign(template.id, {
                nameStyle: {
                    positionX: namePct.x * pdfDims.w,
                    positionY: namePct.y * pdfDims.h,
                    fontSize,
                    color: nameColor,
                    fontFamily,
                    align: nameAlign,
                },
                qrStyle: {
                    positionX: qrPct.x * pdfDims.w,
                    positionY: qrPct.y * pdfDims.h,
                    size: qrSize,
                    foregroundColor: qrFgColor,
                    backgroundColor: qrBgColor,
                },
                dateStyle: {
                    positionX: datePct.x * pdfDims.w,
                    positionY: datePct.y * pdfDims.h,
                    fontSize: dateFontSize,
                    color: dateColor,
                    fontFamily: dateFontFamily,
                    align: dateAlign,
                },
            });
            onSaved();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error al guardar el diseño';
            setError(msg);
            onError?.(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Handlers de Draggable ─────────────────────────────────────────────────
    const makeOnStop = (
        align: 'left' | 'center',
        nodeRef: React.RefObject<HTMLDivElement | null>,
        setPct: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
    ) => (_: unknown, data: { x: number; y: number }) => {
        if (!containerRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        const anchorX = align === 'center'
            ? data.x + (nodeRef.current?.offsetWidth ?? 0) / 2
            : data.x;
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
        <div className="design-picker">
            <div className="design-picker__canvas-col">
                <div className="design-canvas">
                    <div className="design-canvas__toolbar">
                        <p className="design-canvas__title">
                            {draggablesReady ? 'Arrastra cada elemento a su posición' : 'Cargando PDF…'}
                        </p>
                        <div className="design-zoom">
                            <span className="design-zoom__label">Zoom</span>
                            <input
                                type="range" min={0.5} max={2.5} step={0.1} value={zoomLevel}
                                onChange={e => setZoomLevel(Number(e.target.value))}
                                className="design-zoom__range"
                                aria-label="Zoom"
                            />
                            <span className="design-zoom__value">{Math.round(zoomLevel * 100)}%</span>
                            <button
                                type="button"
                                onClick={() => setZoomLevel(1)}
                                title="Restablecer zoom"
                                aria-label="Restablecer zoom"
                                className="btn-ghost btn-sm btn-icon"
                            >↺</button>
                        </div>
                    </div>

                    <div
                        ref={viewportRef}
                        style={{
                            overflow: 'auto',
                            width: viewportWidth > 0 ? `${viewportWidth}px` : '100%',
                            height: canvasNaturalHeightRef.current > 0 ? `${canvasNaturalHeightRef.current}px` : 'auto',
                            maxHeight: '85vh',
                        }}
                    >
                        <div style={{
                            width:  viewportWidth > 0 ? `${viewportWidth * Math.max(1, zoomLevel)}px` : '100%',
                            height: canvasNaturalHeightRef.current > 0 ? `${canvasNaturalHeightRef.current * zoomLevel}px` : 'auto',
                            minWidth: '100%',
                            position: 'relative',
                            flexShrink: 0,
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: viewportWidth > 0 ? `${viewportWidth}px` : '100%',
                                transform: `scale(${zoomLevel})`,
                                transformOrigin: 'top left',
                            }}>
                                <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                    <canvas ref={canvasRef} style={{ display: 'block', width: '100%', boxShadow: 'var(--shadow-md)', pointerEvents: 'none' }} />

                                    {draggablesReady && (
                                        <>
                                            <Draggable
                                                nodeRef={nameNodeRef}
                                                bounds="parent"
                                                defaultPosition={nameDefaultPos!}
                                                onStop={onNameStop}
                                                scale={zoomLevel}
                                            >
                                                <div
                                                    ref={nameNodeRef}
                                                    className={`design-marker design-marker--name${nameAlign === 'center' ? ' design-marker--centered' : ''}`}
                                                    style={{
                                                        fontFamily: selectedFont.css,
                                                        fontWeight: selectedFont.weight,
                                                        fontStyle: selectedFont.style,
                                                        fontSize: `${displayFontSize()}px`,
                                                        color: nameColor,
                                                    }}
                                                >
                                                    Ana García
                                                </div>
                                            </Draggable>

                                            <Draggable
                                                nodeRef={qrNodeRef}
                                                bounds="parent"
                                                defaultPosition={qrDefaultPos!}
                                                onStop={onQrStop}
                                                scale={zoomLevel}
                                            >
                                                <div
                                                    ref={qrNodeRef}
                                                    className="design-marker design-marker--qr"
                                                    style={{ width: `${displayQrSize()}px`, height: `${displayQrSize()}px` }}
                                                >
                                                    <QRCodeSVG value="https://marsnailsacademy.com/certificados/ejemplo" size={displayQrSize()} fgColor={qrFgColor} bgColor={qrBgColor} />
                                                </div>
                                            </Draggable>

                                            <Draggable
                                                nodeRef={dateNodeRef}
                                                bounds="parent"
                                                defaultPosition={dateDefaultPos!}
                                                onStop={onDateStop}
                                                scale={zoomLevel}
                                            >
                                                <div
                                                    ref={dateNodeRef}
                                                    className={`design-marker design-marker--date${dateAlign === 'center' ? ' design-marker--centered' : ''}`}
                                                    style={{
                                                        fontFamily: selectedDateFont.css,
                                                        fontWeight: selectedDateFont.weight,
                                                        fontStyle: selectedDateFont.style,
                                                        fontSize: `${Math.max(8, Math.round(dateFontSize * getDisplayScale()))}px`,
                                                        color: dateColor,
                                                    }}
                                                >
                                                    11/03/2026
                                                </div>
                                            </Draggable>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="design-legend">
                    <span><span className="design-legend__mark design-legend__mark--name">━ ━</span> Nombre del alumno</span>
                    <span><span className="design-legend__mark design-legend__mark--qr">━ ━</span> Código QR</span>
                    <span><span className="design-legend__mark design-legend__mark--date">━ ━</span> Fecha</span>
                </div>
            </div>

            {/* Panel de opciones */}
            <div className="admin-card design-panel">
                <h3 className="design-panel__title">Opciones de estilo</h3>

                <FontSelect label="Tipo de letra" value={fontFamily} onChange={setFontFamily} />
                <p
                    className="design-panel__font-preview"
                    style={{
                        fontFamily: selectedFont.css, fontWeight: selectedFont.weight,
                        fontStyle: selectedFont.style, color: nameColor,
                    }}
                >
                    Ana García
                </p>

                <AlignToggle label="Posición del nombre" value={nameAlign} onChange={setNameAlign} tone="name" />
                {nameAlign === 'center' && (
                    <p className="form-hint design-panel__hint">
                        El punto donde sueltes el elemento será el centro del nombre, sin importar su longitud.
                    </p>
                )}

                <RangeField label="Tamaño de fuente" min={8} max={120} step={1} value={fontSize} onChange={setFontSize} tone="name" />
                <ColorField label="Color del nombre" value={nameColor} onChange={setNameColor} />

                <hr className="design-panel__divider" />

                <RangeField label="Tamaño del QR" min={30} max={250} step={5} value={qrSize} onChange={setQrSize} tone="qr" />
                <ColorField label="Color del QR (módulos)" value={qrFgColor} onChange={setQrFgColor} />
                <ColorField label="Color de fondo del QR" value={qrBgColor} onChange={setQrBgColor} />

                <hr className="design-panel__divider" />

                <FontSelect label="Tipo de letra (fecha)" value={dateFontFamily} onChange={setDateFontFamily} />
                <AlignToggle label="Posición de la fecha" value={dateAlign} onChange={setDateAlign} tone="date" />
                <RangeField label="Tamaño de fuente (fecha)" min={6} max={80} step={1} value={dateFontSize} onChange={setDateFontSize} tone="date" />
                <ColorField label="Color de la fecha" value={dateColor} onChange={setDateColor} />

                {error && <p className="confirm-dialog__error">{error}</p>}

                <button type="button" className="btn-primary design-panel__save" onClick={handleSave}
                    disabled={saving || !draggablesReady}>
                    {saving ? 'Guardando…' : 'Guardar diseño'}
                </button>

                <p className="design-panel__specs">
                    PDF: {ptsToMm(pdfDims.w)}×{ptsToMm(pdfDims.h)} mm ({ptsToPx(pdfDims.w)}×{ptsToPx(pdfDims.h)} px a 300 DPI)
                    <br />
                    Formato: {template.paperFormat} · Calidad de impresión
                </p>
            </div>
        </div>
    );
};
