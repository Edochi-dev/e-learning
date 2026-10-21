import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { QRCodeSVG } from 'qrcode.react';
// Build legacy: el moderno usa Uint8Array.toHex, que navegadores no actualizados no tienen.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {
    CertificateGateway, CertificateTemplate, NameStyle, QrStyle, DateStyle, TemplateDesign,
} from '../gateways/CertificateGateway';
import { ptsToMm, ptsToPx } from '../lib/pdf-units';
import {
    anchorFromLeft, clampBox, fitScale, isHexColor, leftEdge, realign, type Align, type Point,
} from '../lib/certificate-design';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

// ── Catálogo de fuentes ─────────────────────────────────────────────────────
// Helvetica y Times no existen en el navegador: se muestran con Arimo y Tinos,
// que tienen sus mismas medidas, para que el ancho en pantalla sea el impreso.
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
    { value: 'Helvetica',                        label: 'Helvetica (estándar PDF)',                css: "Arimo, Helvetica, Arial, sans-serif",        weight: 'normal', style: 'normal', group: 'Estándar PDF' },
    { value: 'HelveticaBold',                    label: 'Helvetica Bold (estándar PDF)',           css: "Arimo, Helvetica, Arial, sans-serif",        weight: 'bold',   style: 'normal', group: 'Estándar PDF' },
    { value: 'TimesRoman',                       label: 'Times Roman (estándar PDF)',              css: "Tinos, 'Times New Roman', serif",            weight: 'normal', style: 'normal', group: 'Estándar PDF' },
    { value: 'TimesBold',                        label: 'Times Bold (estándar PDF)',               css: "Tinos, 'Times New Roman', serif",            weight: 'bold',   style: 'normal', group: 'Estándar PDF' },
    { value: 'TimesItalic',                      label: 'Times Italic (estándar PDF)',             css: "Tinos, 'Times New Roman', serif",            weight: 'normal', style: 'italic', group: 'Estándar PDF' },
    { value: 'TimesBoldItalic',                  label: 'Times Bold Italic (estándar PDF)',        css: "Tinos, 'Times New Roman', serif",            weight: 'bold',   style: 'italic', group: 'Estándar PDF' },
];

const FONT_GROUPS = [...new Set(FONT_OPTIONS.map(f => f.group))];

const fontOf = (value: string): FontOption => FONT_OPTIONS.find(f => f.value === value) ?? FONT_OPTIONS[0];

type ElementId = 'name' | 'date' | 'qr';
type MarkerTone = ElementId;

const ELEMENTS: { id: ElementId; label: string }[] = [
    { id: 'name', label: 'Nombre' },
    { id: 'date', label: 'Fecha' },
    { id: 'qr', label: 'Código QR' },
];

// Posición inicial en modo creación, como fracción de la hoja.
const INITIAL_NAME_PCT = { x: 0.50, y: 0.35 };
const INITIAL_QR_PCT   = { x: 0.78, y: 0.72 };
const INITIAL_DATE_PCT = { x: 0.50, y: 0.55 };

// Margen que el backend deja alrededor de los módulos del QR (qr-code.service).
const QR_MARGIN = 0.04;

const todayIso = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
// Mismo formato que CertificateDate.toDisplay() del backend.
const displayDate = (iso: string): string => iso.split('-').reverse().join('/');

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

/** Selector de color + código hex; el hex se valida como lo hace el backend. */
const ColorField = ({ label, value, onChange }: {
    label: string; value: string; onChange: (value: string) => void;
}) => {
    const valid = isHexColor(value);
    return (
        <div className="form-group">
            <label>{label}</label>
            <div className="design-color">
                <input type="color" value={valid ? value : '#000000'} onChange={e => onChange(e.target.value)} // design-tokens: allow — valor de reserva del selector
                    className="design-color__swatch" aria-label={label} />
                <input type="text" value={value} onChange={e => onChange(e.target.value.trim())}
                    className="design-color__hex" aria-label={`${label} (hex)`} aria-invalid={!valid} />
            </div>
            {!valid && <p className="design-color__error">Usa el formato #RRGGBB, por ejemplo #1a1a1a.</p>} {/* design-tokens: allow — texto de ayuda */}
        </div>
    );
};

/** Izquierda / Centrado como botones segmentados. */
const AlignToggle = ({ label, value, onChange, tone }: {
    label: string; value: Align; onChange: (value: Align) => void; tone: MarkerTone;
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

/** Dibuja la primera página de un PDF en un canvas, a alta resolución (la pantalla la escala). */
const usePdfCanvas = (source: Blob | null, canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    // "Cargando" no se guarda: es no haber dibujado todavía ESTE pdf.
    const [drawn, setDrawn] = useState<{ source: Blob; ok: boolean } | null>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!source || !canvas) return;
        let cancelled = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let task: any = null;
        (async () => {
            const pdf = await pdfjsLib.getDocument({ data: await source.arrayBuffer() }).promise;
            const page = await pdf.getPage(1);
            if (cancelled) return;
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: Math.min(2400 / base.width, 3) });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            task = page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas });
            await task.promise;
            if (!cancelled) setDrawn({ source, ok: true });
        })().catch(() => { if (!cancelled) setDrawn({ source, ok: false }); });
        return () => {
            cancelled = true;
            try { task?.cancel(); } catch { /* ya terminó */ }
        };
    }, [source, canvasRef]);
    if (!source) return 'idle';
    if (drawn?.source !== source) return 'loading';
    return drawn.ok ? 'ready' : 'error';
};

/** Alto que deja libre la ventana bajo el elemento (modo "sin scroll de página"). */
const useFillHeight = (ref: React.RefObject<HTMLElement | null>, enabled: boolean) => {
    const [height, setHeight] = useState<number | null>(null);
    useLayoutEffect(() => {
        if (!enabled || !ref.current) return;
        const update = () => {
            if (!ref.current) return;
            // offsetTop y no getBoundingClientRect: la página entra con una
            // animación translateY y mediríamos 20px de más al montar.
            let top = 0;
            for (let el: HTMLElement | null = ref.current; el; el = el.offsetParent as HTMLElement | null) top += el.offsetTop;
            setHeight(Math.max(360, window.innerHeight - top - 16));
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [ref, enabled]);
    return enabled ? height : null;
};

const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = () => setMatches(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [query]);
    return matches;
};

export interface TemplateDesignInitialStyles {
    nameStyle: NameStyle;
    qrStyle: QrStyle;
    dateStyle: DateStyle;
}

export interface TemplateDesignPickerProps {
    /** Plantilla ya guardada (id, tamaño de página, formato); el picker solo edita su diseño. */
    template: CertificateTemplate;
    /** Bytes del PDF base: de una subida reciente o del backend. */
    pdfSource: File | Blob;
    /** Diseño guardado (modo edición). Sin él, el picker arranca con posiciones por defecto. */
    initialStyles?: TemplateDesignInitialStyles;
    gateway: CertificateGateway;
    onSaved: () => void;
    onError?: (message: string) => void;
}

/**
 * Editor visual del diseño de una plantilla: posición, tipografía, tamaño,
 * color y alineación del nombre y la fecha, y tamaño y colores del QR.
 *
 * Una sola fuente de verdad: las posiciones en puntos PDF, como las guarda y
 * dibuja el backend. La pantalla se deriva con un factor px/pt (ajuste a la
 * pantalla × zoom), así redimensionar, hacer zoom o cambiar la alineación
 * nunca desincroniza lo que se ve de lo que se imprime. "Vista previa real"
 * pide al backend el certificado dibujado de verdad.
 */
export const TemplateDesignPicker: React.FC<TemplateDesignPickerProps> = ({
    template, pdfSource, initialStyles, gateway, onSaved, onError,
}) => {
    const page = { width: template.pageWidth, height: template.pageHeight };
    const atPct = (pct: Point): Point => ({ x: pct.x * page.width, y: pct.y * page.height });

    // ── Diseño (todo en pt) ───────────────────────────────────────────────────
    const [name, setName] = useState<Point>(() => initialStyles
        ? { x: initialStyles.nameStyle.positionX, y: initialStyles.nameStyle.positionY } : atPct(INITIAL_NAME_PCT));
    const [date, setDate] = useState<Point>(() => initialStyles
        ? { x: initialStyles.dateStyle.positionX, y: initialStyles.dateStyle.positionY } : atPct(INITIAL_DATE_PCT));
    const [qr, setQr] = useState<Point>(() => initialStyles
        ? { x: initialStyles.qrStyle.positionX, y: initialStyles.qrStyle.positionY } : atPct(INITIAL_QR_PCT));

    const [fontFamily, setFontFamily] = useState(initialStyles?.nameStyle.fontFamily ?? 'GreatVibes-Regular');
    const [fontSize, setFontSize] = useState(initialStyles?.nameStyle.fontSize ?? 36);
    const [nameColor, setNameColor] = useState(initialStyles?.nameStyle.color ?? '#1a1a1a'); // design-tokens: allow — se imprime en el PDF
    const [nameAlign, setNameAlign] = useState<Align>(initialStyles?.nameStyle.align ?? 'left');
    const [qrSize, setQrSize] = useState(initialStyles?.qrStyle.size ?? 90);
    const [qrFgColor, setQrFgColor] = useState(initialStyles?.qrStyle.foregroundColor ?? '#000000'); // design-tokens: allow — se imprime en el PDF
    const [qrBgColor, setQrBgColor] = useState(initialStyles?.qrStyle.backgroundColor ?? '#ffffff'); // design-tokens: allow — se imprime en el PDF
    const [dateFontSize, setDateFontSize] = useState(initialStyles?.dateStyle.fontSize ?? 18);
    const [dateColor, setDateColor] = useState(initialStyles?.dateStyle.color ?? '#1a1a1a'); // design-tokens: allow — se imprime en el PDF
    const [dateFontFamily, setDateFontFamily] = useState(initialStyles?.dateStyle.fontFamily ?? 'Helvetica');
    const [dateAlign, setDateAlign] = useState<Align>(initialStyles?.dateStyle.align ?? 'left');

    const [sampleName, setSampleName] = useState('Ana García');
    const [sampleDate] = useState(todayIso);

    // ── Pantalla ──────────────────────────────────────────────────────────────
    const fill = useMediaQuery('(min-width: 900px) and (min-height: 600px)');
    const workspaceRef = useRef<HTMLDivElement>(null);
    const workspaceHeight = useFillHeight(workspaceRef, fill);
    const stageRef = useRef<HTMLDivElement>(null);
    const [available, setAvailable] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(1);
    const [selected, setSelected] = useState<ElementId>('name');

    useLayoutEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const measure = () => {
            const style = getComputedStyle(stage);
            const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            // En pantalla angosta el alto de la escena lo pone su max-height del CSS.
            const maxHeight = parseFloat(style.maxHeight);
            const height = fill ? stage.clientHeight : Number.isFinite(maxHeight) ? maxHeight : 0;
            setAvailable({
                width: stage.clientWidth - padX,
                height: height > 0 ? height - padY : 0,
            });
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [fill, workspaceHeight]);

    const k = fitScale(available, page, zoom); // px por pt
    const sheet = { width: page.width * k, height: page.height * k };

    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const bgState = usePdfCanvas(pdfSource, bgCanvasRef);

    // ── Ancho real de los textos (pt), medido sobre el marcador ───────────────
    const nameRef = useRef<HTMLDivElement>(null);
    const dateRef = useRef<HTMLDivElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [nameWidth, setNameWidth] = useState(0);
    const [dateWidth, setDateWidth] = useState(0);
    const [dateBaselineShift, setDateBaselineShift] = useState(0);
    const [fontsTick, setFontsTick] = useState(0);

    const nameFont = fontOf(fontFamily);
    const dateFont = fontOf(dateFontFamily);

    // Medir antes de que la fuente cargue daría el ancho de la fuente de reserva.
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            document.fonts.load(`${nameFont.style} ${nameFont.weight} 40px ${nameFont.css}`),
            document.fonts.load(`${dateFont.style} ${dateFont.weight} 40px ${dateFont.css}`),
        ]).catch(() => undefined).then(() => { if (!cancelled) setFontsTick(t => t + 1); });
        return () => { cancelled = true; };
    }, [nameFont, dateFont]);

    useLayoutEffect(() => {
        if (k <= 0) return;
        if (nameRef.current) setNameWidth(nameRef.current.offsetWidth / k);
        if (dateRef.current) {
            setDateWidth(dateRef.current.offsetWidth / k);
            // El backend apoya la fecha en (y + tamaño); CSS la apoya en (y + ascenso
            // de la fuente). Medimos el ascenso y corregimos la diferencia.
            const probe = document.createElement('span');
            probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
            dateRef.current.appendChild(probe);
            const ascentPx = probe.getBoundingClientRect().top - dateRef.current.getBoundingClientRect().top;
            probe.remove();
            setDateBaselineShift(dateFontSize * k - ascentPx);
        }
    }, [k, fontFamily, fontSize, sampleName, dateFontFamily, dateFontSize, fontsTick, bgState]);

    // ── Mover y realinear (siempre en pt) ─────────────────────────────────────
    const changeNameAlign = (next: Align) => {
        setName(p => ({ ...p, x: realign(p.x, nameWidth, nameAlign, next) }));
        setNameAlign(next);
    };
    const changeDateAlign = (next: Align) => {
        setDate(p => ({ ...p, x: realign(p.x, dateWidth, dateAlign, next) }));
        setDateAlign(next);
    };

    const moveText = (setPoint: React.Dispatch<React.SetStateAction<Point>>, width: number, align: Align, heightPt: number) =>
        (left: number, top: number) => {
            const box = clampBox(left, top, { width, height: heightPt }, page);
            setPoint({ x: anchorFromLeft(box.x, width, align), y: box.y });
        };
    const moveName = moveText(setName, nameWidth, nameAlign, fontSize);
    const moveDate = moveText(setDate, dateWidth, dateAlign, dateFontSize);
    const moveQr = (left: number, top: number) => setQr(clampBox(left, top, { width: qrSize, height: qrSize }, page));

    const nameLeft = leftEdge(name.x, nameWidth, nameAlign);
    const dateLeft = leftEdge(date.x, dateWidth, dateAlign);

    // Flechas: 1 pt; con Mayús, 10 pt. Precisión que el arrastre no da.
    const nudge = (id: ElementId) => (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 10 : 1;
        const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!delta) return;
        e.preventDefault();
        const [dx, dy] = delta;
        if (id === 'name') moveName(nameLeft + dx, name.y + dy);
        if (id === 'date') moveDate(dateLeft + dx, date.y + dy);
        if (id === 'qr') moveQr(qr.x + dx, qr.y + dy);
    };

    // ── Diseño a enviar ───────────────────────────────────────────────────────
    const design = (): TemplateDesign => ({
        nameStyle: { positionX: name.x, positionY: name.y, fontSize, color: nameColor, fontFamily, align: nameAlign },
        qrStyle: { positionX: qr.x, positionY: qr.y, size: qrSize, foregroundColor: qrFgColor, backgroundColor: qrBgColor },
        dateStyle: { positionX: date.x, positionY: date.y, fontSize: dateFontSize, color: dateColor, fontFamily: dateFontFamily, align: dateAlign },
    });
    const colorsValid = [nameColor, qrFgColor, qrBgColor, dateColor].every(isHexColor);
    const ready = bgState === 'ready' && k > 0;

    // ── Vista previa real ─────────────────────────────────────────────────────
    const [preview, setPreview] = useState<Blob | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewState = usePdfCanvas(preview, previewCanvasRef);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Cualquier cambio deja vieja la vista previa: se vuelve a editar.
    const designKey = JSON.stringify(design()) + sampleName;
    const shownKeyRef = useRef<string | null>(null);
    useEffect(() => {
        if (preview && shownKeyRef.current !== designKey) setPreview(null);
    }, [designKey, preview]);

    const showPreview = async () => {
        setError(null);
        setPreviewing(true);
        try {
            const blob = await gateway.previewTemplateDesign(template.id, design(), {
                sampleName: sampleName.trim() || 'Ana García',
                sampleDate,
            });
            shownKeyRef.current = designKey;
            setPreview(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo generar la vista previa');
        } finally {
            setPreviewing(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await gateway.updateTemplateDesign(template.id, design());
            onSaved();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error al guardar el diseño';
            setError(msg);
            onError?.(msg);
        } finally {
            setSaving(false);
        }
    };

    const select = useCallback((id: ElementId) => () => setSelected(id), []);
    const sampleText = sampleName.trim() || 'Ana García';

    return (
        <div
            ref={workspaceRef}
            className={`design-workspace${fill ? ' design-workspace--fill' : ''}`}
            style={workspaceHeight ? { height: workspaceHeight } : undefined}
        >
            <section className="design-stage-col" aria-label="Certificado">
                <div className="design-toolbar">
                    <label className="design-sample">
                        <span>Nombre de prueba</span>
                        <input type="text" value={sampleName} maxLength={120}
                            onChange={e => setSampleName(e.target.value)} placeholder="Ana García" />
                    </label>
                    <div className="design-zoom" role="group" aria-label="Zoom">
                        <button type="button" className="btn-secondary btn-sm btn-icon" aria-label="Alejar"
                            onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))} disabled={zoom <= 1}>−</button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setZoom(1)} aria-pressed={zoom === 1}>
                            {zoom === 1 ? 'Ajustado' : `${Math.round(zoom * 100)}%`}
                        </button>
                        <button type="button" className="btn-secondary btn-sm btn-icon" aria-label="Acercar"
                            onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}>+</button>
                    </div>
                    {preview ? (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setPreview(null)}>
                            Volver a editar
                        </button>
                    ) : (
                        <button type="button" className="btn-gold btn-sm" onClick={showPreview}
                            disabled={!ready || previewing || !colorsValid}>
                            {previewing ? 'Generando…' : 'Vista previa real'}
                        </button>
                    )}
                </div>

                <div className="design-stage" ref={stageRef}>
                    <div className="design-sheet" style={{ width: sheet.width, height: sheet.height }}>
                        <canvas ref={bgCanvasRef} className="design-sheet__canvas" hidden={!!preview} />
                        <canvas ref={previewCanvasRef} className="design-sheet__canvas" hidden={!preview} />
                        {!ready && <p className="design-sheet__status">{bgState === 'error' ? 'No se pudo abrir el PDF.' : 'Cargando PDF…'}</p>}
                        {preview && previewState !== 'ready' && <p className="design-sheet__status">Dibujando la vista previa…</p>}

                        {ready && !preview && (
                            <>
                                <Draggable nodeRef={nameRef} bounds="parent" position={{ x: nameLeft * k, y: name.y * k }}
                                    onStart={select('name')} onDrag={(_, d) => moveName(d.x / k, d.y / k)}>
                                    <div
                                        ref={nameRef} tabIndex={0} role="button" aria-label="Nombre: arrastra o usa las flechas"
                                        className={`design-marker design-marker--name${nameAlign === 'center' ? ' design-marker--centered' : ''}${selected === 'name' ? ' design-marker--selected' : ''}`}
                                        onFocus={select('name')} onKeyDown={nudge('name')}
                                        style={{
                                            fontFamily: nameFont.css, fontWeight: nameFont.weight, fontStyle: nameFont.style,
                                            fontSize: `${fontSize * k}px`, color: nameColor,
                                        }}
                                    >
                                        {sampleText}
                                    </div>
                                </Draggable>

                                <Draggable nodeRef={dateRef} bounds="parent" position={{ x: dateLeft * k, y: date.y * k }}
                                    onStart={select('date')} onDrag={(_, d) => moveDate(d.x / k, d.y / k)}>
                                    <div
                                        ref={dateRef} tabIndex={0} role="button" aria-label="Fecha: arrastra o usa las flechas"
                                        className={`design-marker design-marker--date${dateAlign === 'center' ? ' design-marker--centered' : ''}${selected === 'date' ? ' design-marker--selected' : ''}`}
                                        onFocus={select('date')} onKeyDown={nudge('date')}
                                        style={{
                                            fontFamily: dateFont.css, fontWeight: dateFont.weight, fontStyle: dateFont.style,
                                            fontSize: `${dateFontSize * k}px`, color: dateColor,
                                        }}
                                    >
                                        <span className="design-marker__text" style={{ transform: `translateY(${dateBaselineShift}px)` }}>
                                            {displayDate(sampleDate)}
                                        </span>
                                    </div>
                                </Draggable>

                                <Draggable nodeRef={qrRef} bounds="parent" position={{ x: qr.x * k, y: qr.y * k }}
                                    onStart={select('qr')} onDrag={(_, d) => moveQr(d.x / k, d.y / k)}>
                                    <div
                                        ref={qrRef} tabIndex={0} role="button" aria-label="Código QR: arrastra o usa las flechas"
                                        className={`design-marker design-marker--qr${selected === 'qr' ? ' design-marker--selected' : ''}`}
                                        onFocus={select('qr')} onKeyDown={nudge('qr')}
                                        style={{ width: qrSize * k, height: qrSize * k, padding: qrSize * k * QR_MARGIN, background: qrBgColor }}
                                    >
                                        <QRCodeSVG value="https://marisnails.academy/certificados/ejemplo"
                                            size={qrSize * k * (1 - 2 * QR_MARGIN)} fgColor={qrFgColor} bgColor={qrBgColor} />
                                    </div>
                                </Draggable>
                            </>
                        )}
                    </div>
                </div>

                <div className="design-stage__foot">
                    <p className={`design-stage__hint${preview ? '' : ' design-stage__hint--keys'}`}>
                        {preview
                            ? 'Así se imprimirá: lo dibujó el servidor con el mismo generador de los certificados.'
                            : 'Arrastra cada elemento o selecciónalo y muévelo con las flechas (Mayús: de a 10).'}
                    </p>
                    <p className="design-stage__specs">
                        {ptsToMm(page.width)}×{ptsToMm(page.height)} mm · {ptsToPx(page.width)}×{ptsToPx(page.height)} px a 300 DPI · {template.paperFormat}
                    </p>
                </div>
            </section>

            <aside className="admin-card design-panel">
                <div className="design-tabs" role="tablist" aria-label="Elemento">
                    {ELEMENTS.map(el => (
                        <button key={el.id} type="button" role="tab" aria-selected={selected === el.id}
                            className={`design-tabs__tab design-tabs__tab--${el.id}`} onClick={() => setSelected(el.id)}>
                            {el.label}
                        </button>
                    ))}
                </div>

                <div className="design-panel__body" role="tabpanel">
                    {selected === 'name' && (
                        <>
                            <FontSelect label="Tipo de letra" value={fontFamily} onChange={setFontFamily} />
                            <AlignToggle label="Alineación" value={nameAlign} onChange={changeNameAlign} tone="name" />
                            <RangeField label="Tamaño" min={8} max={120} step={1} value={fontSize} onChange={setFontSize} tone="name" />
                            <ColorField label="Color" value={nameColor} onChange={setNameColor} />
                        </>
                    )}
                    {selected === 'date' && (
                        <>
                            <FontSelect label="Tipo de letra" value={dateFontFamily} onChange={setDateFontFamily} />
                            <AlignToggle label="Alineación" value={dateAlign} onChange={changeDateAlign} tone="date" />
                            <RangeField label="Tamaño" min={6} max={80} step={1} value={dateFontSize} onChange={setDateFontSize} tone="date" />
                            <ColorField label="Color" value={dateColor} onChange={setDateColor} />
                        </>
                    )}
                    {selected === 'qr' && (
                        <>
                            <RangeField label="Tamaño" min={30} max={250} step={5} value={qrSize} onChange={setQrSize} tone="qr" />
                            <ColorField label="Color de los módulos" value={qrFgColor} onChange={setQrFgColor} />
                            <ColorField label="Color de fondo" value={qrBgColor} onChange={setQrBgColor} />
                        </>
                    )}
                </div>

                <div className="design-panel__footer">
                    {error && <p className="confirm-dialog__error" role="alert">{error}</p>}
                    <button type="button" className="btn-primary design-panel__save" onClick={handleSave}
                        disabled={saving || !ready || !colorsValid}>
                        {saving ? 'Guardando…' : 'Guardar diseño'}
                    </button>
                </div>
            </aside>
        </div>
    );
};
