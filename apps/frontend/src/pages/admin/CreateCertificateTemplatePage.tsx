import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
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

const PAPER_FORMATS = [
    { value: 'A4', label: 'A4 (210×297 mm) — Estándar' },
    { value: 'A3', label: 'A3 (297×420 mm) — Grande' },
];

type FontOption = {
    value: string; label: string; css: string;
    weight: string; style: string; group: string;
};

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
    const [formPaperFormat, setFormPaperFormat] = useState('A4');
    const [file, setFile]                       = useState<File | null>(null);
    const [template, setTemplate]               = useState<CertificateTemplate | null>(null);

    // ── Refs ──────────────────────────────────────────────────────────────────
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nameNodeRef  = useRef<HTMLDivElement>(null);
    const qrNodeRef    = useRef<HTMLDivElement>(null);

    const [pdfDims, setPdfDims] = useState({ w: 0, h: 0 });

    // Posiciones iniciales en píxeles CSS para defaultPosition de Draggable.
    // null = aún no calculadas (Draggables no montan hasta que tengan valor).
    const [nameDefaultPos, setNameDefaultPos] = useState<{ x: number; y: number } | null>(null);
    const [qrDefaultPos,   setQrDefaultPos]   = useState<{ x: number; y: number } | null>(null);

    // Proporciones (0–1): lo que se convierte a puntos PDF al guardar.
    // Se actualizan en onStop.
    const [namePct, setNamePct] = useState(INITIAL_NAME_PCT);
    const [qrPct,   setQrPct]   = useState(INITIAL_QR_PCT);

    // ── Estilo ────────────────────────────────────────────────────────────────
    const [fontFamily, setFontFamily] = useState('GreatVibes-Regular');
    const [fontSize, setFontSize]     = useState(36);
    const [nameColor, setNameColor]   = useState('#1a1a1a');
    const [qrSize, setQrSize]         = useState(90);

    // ── UI ────────────────────────────────────────────────────────────────────
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState<string | null>(null);

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
    }, [canvasRendered]);

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

    // ── Callbacks de Draggable (modo NO controlado) ───────────────────────────
    // data.x / data.y = posición absoluta del elemento desde la esquina
    // superior-izquierda del contenedor padre, en píxeles CSS.
    // react-draggable los acumula internamente sin depender del state de React.
    const onNameStop = (_: unknown, data: { x: number; y: number }) => {
        if (!containerRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        setNamePct({
            x: Math.max(0, Math.min(1, data.x / w)),
            y: Math.max(0, Math.min(1, data.y / h)),
        });
    };

    const onQrStop = (_: unknown, data: { x: number; y: number }) => {
        if (!containerRef.current) return;
        const { offsetWidth: w, offsetHeight: h } = containerRef.current;
        setQrPct({
            x: Math.max(0, Math.min(1, data.x / w)),
            y: Math.max(0, Math.min(1, data.y / h)),
        });
    };

    const draggablesReady = nameDefaultPos !== null && qrDefaultPos !== null;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Nueva Plantilla de Certificado</h1>
                <p>Sube el PDF en blanco y posiciona el nombre y el QR arrastrándolos.</p>
            </div>

            {!template ? (
                /* ── PASO 1 ──────────────────────────────────────────────── */
                <div className="admin-card" style={{ maxWidth: '520px' }}>
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
                            {PAPER_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            El PDF que subas debe coincidir con este formato para impresión correcta.
                        </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label">Archivo PDF (plantilla en blanco)</label>
                        <input type="file" accept="application/pdf" className="form-input"
                            onChange={e => setFile(e.target.files?.[0] ?? null)} />
                    </div>

                    {error && <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem' }}>{error}</p>}

                    <button className="btn-primary" onClick={handleUpload}
                        disabled={uploading || !formName || !formAbbr || !file}>
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
                                                padding: '2px 4px',
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
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
                            <span><span style={{ color: '#e84393', fontWeight: 700 }}>━ ━</span> Nombre del alumno</span>
                            <span><span style={{ color: '#d4a574', fontWeight: 700 }}>━ ━</span> Código QR</span>
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

                        {error && <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}

                        <button className="btn-primary" onClick={handleSave}
                            disabled={saving || !draggablesReady} style={{ width: '100%' }}>
                            {saving ? 'Guardando…' : 'Guardar Plantilla'}
                        </button>

                        <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                            <span>PDF: {Math.round(pdfDims.w)} × {Math.round(pdfDims.h)} pts</span><br />
                            <span>Formato: {template.paperFormat} · 300 DPI para impresión</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
