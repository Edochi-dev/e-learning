import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import { QRCodeSVG } from 'qrcode.react';
import * as pdfjsLib from 'pdfjs-dist';
import type { CertificateGateway, CertificateTemplate, NameStyle, QrStyle, DateStyle } from '../gateways/CertificateGateway';
import { ptsToMm, ptsToPx } from '../lib/pdf-units';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
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
    const [nameColor,      setNameColor]      = useState(initialStyles?.nameStyle.color      ?? '#1a1a1a');
    const [nameAlign,      setNameAlign]      = useState<'left' | 'center'>(initialStyles?.nameStyle.align ?? 'left');
    const [qrSize,         setQrSize]         = useState(initialStyles?.qrStyle.size         ?? 90);
    const [showDate,       setShowDate]       = useState(initialStyles?.dateStyle.show       ?? true);
    const [dateFontSize,   setDateFontSize]   = useState(initialStyles?.dateStyle.fontSize   ?? 18);
    const [dateColor,      setDateColor]      = useState(initialStyles?.dateStyle.color      ?? '#1a1a1a');
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
    const pdfDims = { w: template.pageWidth, h: template.pageHeight };

    // ── Renderizar PDF ────────────────────────────────────────────────────────
    const renderPdf = useCallback(async (source: File | Blob) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        const pdf  = await pdfjsLib.getDocument({ data: await source.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(780 / viewport.width, 1.5);
        const sv = page.getViewport({ scale });

        canvas.width  = sv.width;
        canvas.height = sv.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: sv, canvas }).promise;

        setCanvasRendered(r => r + 1);
    }, []);

    useEffect(() => {
        renderPdf(pdfSource).catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Error al renderizar el PDF');
        });
    }, [pdfSource, renderPdf]);

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
                },
                dateStyle: {
                    show: showDate,
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    background: 'var(--bg-card)', border: '2px solid var(--border)',
                    borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                            {draggablesReady ? 'Arrastra cada elemento a su posición' : 'Cargando PDF…'}
                        </p>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Zoom</span>
                            <input
                                type="range" min={0.5} max={2.5} step={0.1} value={zoomLevel}
                                onChange={e => setZoomLevel(Number(e.target.value))}
                                style={{ width: '100px', accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', minWidth: '36px' }}>
                                {Math.round(zoomLevel * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoomLevel(1)}
                                title="Restablecer zoom"
                                style={{ fontSize: '0.75rem', background: 'none', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', padding: '0.1rem 0.4rem', color: 'var(--text-muted)' }}
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
                                    <canvas ref={canvasRef} style={{ display: 'block', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', pointerEvents: 'none' }} />

                                    {draggablesReady && (
                                        <>
                                            <Draggable
                                                nodeRef={nameNodeRef}
                                                bounds="parent"
                                                defaultPosition={nameDefaultPos!}
                                                onStop={onNameStop}
                                                scale={zoomLevel}
                                            >
                                                <div ref={nameNodeRef} style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    cursor: 'grab',
                                                    userSelect: 'none',
                                                    padding: 0,
                                                    background: 'rgba(232, 67, 147, 0.10)',
                                                    border: '1.5px dashed #e84393',
                                                    borderRadius: '3px',
                                                    fontFamily: selectedFont.css,
                                                    fontWeight: selectedFont.weight,
                                                    fontStyle: selectedFont.style,
                                                    fontSize: `${displayFontSize()}px`,
                                                    color: nameColor,
                                                    whiteSpace: 'nowrap',
                                                    lineHeight: 'normal',
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
                                                scale={zoomLevel}
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
                                                    scale={zoomLevel}
                                                >
                                                    <div ref={dateNodeRef} style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        cursor: 'grab',
                                                        userSelect: 'none',
                                                        padding: 0,
                                                        background: 'rgba(100, 180, 100, 0.10)',
                                                        border: '1.5px dashed #4caf50',
                                                        borderRadius: '3px',
                                                        fontFamily: (FONT_OPTIONS.find(f => f.value === dateFontFamily) ?? FONT_OPTIONS[0]).css,
                                                        fontWeight: (FONT_OPTIONS.find(f => f.value === dateFontFamily) ?? FONT_OPTIONS[0]).weight,
                                                        fontStyle:  (FONT_OPTIONS.find(f => f.value === dateFontFamily) ?? FONT_OPTIONS[0]).style,
                                                        fontSize: `${Math.max(8, Math.round(dateFontSize * getDisplayScale()))}px`,
                                                        color: dateColor,
                                                        whiteSpace: 'nowrap',
                                                        lineHeight: 'normal',
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
                        </div>
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
                    {saving ? 'Guardando…' : 'Guardar diseño'}
                </button>

                <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                    <span>PDF: {ptsToMm(pdfDims.w)}×{ptsToMm(pdfDims.h)} mm ({ptsToPx(pdfDims.w)}×{ptsToPx(pdfDims.h)} px a 300 DPI)</span><br />
                    <span>Formato: {template.paperFormat} · Calidad de impresión</span>
                </div>
            </div>
        </div>
    );
};
