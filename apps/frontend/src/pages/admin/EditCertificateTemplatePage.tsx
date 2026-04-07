import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { CertificateGateway, CertificateTemplate } from '../../gateways/CertificateGateway';
import { useToast } from '../../components/Toast';

interface Props {
    gateway: CertificateGateway;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PAPER_FORMAT_OPTIONS = [
    { value: 'A4 Vertical',   label: 'A4 Vertical' },
    { value: 'A4 Horizontal', label: 'A4 Horizontal' },
    { value: 'A3 Vertical',   label: 'A3 Vertical' },
    { value: 'A3 Horizontal', label: 'A3 Horizontal' },
];

/**
 * EditCertificateTemplatePage
 *
 * Permite al admin editar una plantilla existente:
 *   - Renombrarla
 *   - Cambiar la abreviatura del curso
 *   - Cambiar el formato de papel
 *   - Reemplazar el PDF base por una versión actualizada (logo nuevo, etc.)
 *
 * GARANTÍA NO-DESTRUCTIVA (banner siempre visible):
 *   Esta operación NO altera certificados ya emitidos. Cada certificado tiene
 *   su propio PDF rasterizado en disco y un templateSnapshot inmutable que
 *   congeló los metadatos en el momento de emisión.
 *
 * Si las dimensiones del PDF nuevo difieren de las del PDF anterior, el backend
 * resetea las posiciones (nameStyle/qrStyle/dateStyle) a defaults para evitar
 * dejar la plantilla en un estado visualmente roto. Detectamos esto comparando
 * pageWidth/pageHeight de la respuesta con los valores previos al guardado y
 * mostramos un aviso adicional al admin.
 */
export const EditCertificateTemplatePage: React.FC<Props> = ({ gateway }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();

    const [template, setTemplate] = useState<CertificateTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formName, setFormName] = useState('');
    const [formAbbr, setFormAbbr] = useState('');
    const [formPaperFormat, setFormPaperFormat] = useState('A4 Vertical');
    const [file, setFile] = useState<File | null>(null);

    // Cargamos la plantilla por ID via el endpoint dedicado GET /:id.
    // Cada recurso del sistema tiene su propio endpoint de detalle por ID
    // (mismo patrón que GET /certificates/:id) — nada de filtrar listados.
    const loadTemplate = useCallback(() => {
        if (!id) return;
        setLoading(true);
        gateway.getTemplate(id)
            .then(found => {
                setTemplate(found);
                setFormName(found.name);
                setFormAbbr(found.courseAbbreviation);
                setFormPaperFormat(found.paperFormat);
            })
            .catch((err: unknown) => {
                toast.error(err instanceof Error ? err.message : 'Error al cargar la plantilla');
                navigate('/admin/certificados');
            })
            .finally(() => setLoading(false));
    }, [gateway, id, navigate, toast]);

    useEffect(() => { loadTemplate(); }, [loadTemplate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] ?? null;
        if (selected && selected.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`El archivo supera el límite de ${MAX_FILE_SIZE_MB} MB`);
            e.target.value = '';
            return;
        }
        if (selected && selected.type !== 'application/pdf') {
            toast.error('El archivo debe ser un PDF');
            e.target.value = '';
            return;
        }
        setFile(selected);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!template || !id) return;

        // Construimos el payload SOLO con los campos que cambiaron respecto
        // al original. Esto respeta el PATCH semántico: si el admin no tocó
        // un campo, no lo enviamos y el backend no lo escribe.
        const payload: { name?: string; courseAbbreviation?: string; paperFormat?: string } = {};
        if (formName !== template.name) payload.name = formName.trim();
        if (formAbbr.toUpperCase() !== template.courseAbbreviation) payload.courseAbbreviation = formAbbr.trim();
        if (formPaperFormat !== template.paperFormat) payload.paperFormat = formPaperFormat;

        if (Object.keys(payload).length === 0 && !file) {
            toast.error('No has hecho ningún cambio');
            return;
        }

        setSaving(true);
        try {
            const previousWidth = template.pageWidth;
            const previousHeight = template.pageHeight;

            const updated = await gateway.updateTemplate(id, payload, file ?? undefined);

            // Detectamos si hubo reset de posiciones comparando dimensiones
            // antes/después. Si el PDF cambió de tamaño, el backend reseteó
            // los styles a defaults — el admin tiene que saberlo.
            const dimensionsChanged = file && (
                updated.pageWidth !== previousWidth ||
                updated.pageHeight !== previousHeight
            );

            if (dimensionsChanged) {
                toast.success(
                    'Plantilla actualizada. Las dimensiones del PDF nuevo son distintas, ' +
                    'así que se resetearon las posiciones del nombre y el QR. ' +
                    'Te llevamos al editor de diseño para que las ajustes.',
                );
                // Cerramos el círculo del flujo: si reseteamos, mandamos al
                // admin directamente al picker para que reajuste el diseño
                // antes de generar el siguiente certificado con esta plantilla.
                navigate(`/admin/certificados/plantillas/${id}/diseno`);
            } else {
                toast.success('Plantilla actualizada correctamente');
                navigate('/admin/certificados');
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-page">
                <p style={{ color: 'var(--text-muted)' }}>Cargando plantilla...</p>
            </div>
        );
    }

    if (!template) return null;

    return (
        <div className="admin-page">
            <Link to="/admin/certificados" className="back-link">← Volver a Certificados</Link>
            <div className="admin-header">
                <h1>Editar Plantilla</h1>
                <p>Actualiza los datos de "{template.name}" o reemplaza su PDF base.</p>
            </div>

            {/* ── Banner de advertencia (siempre visible) ───────────────────── */}
            <div
                role="alert"
                style={{
                    border: '1px solid var(--gold, #d4a574)',
                    background: 'rgba(212, 165, 116, 0.08)',
                    borderRadius: '8px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                }}
            >
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--gold, #d4a574)' }}>
                    ⚠ Edición no destructiva
                </p>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '0.9rem' }}>
                    La edición de la plantilla <strong>solo afecta a los certificados que generes a partir de ahora</strong>.
                    Los certificados ya emitidos con esta plantilla <strong>conservarán intacto su diseño original</strong>,
                    porque se almacenan como archivos PDF independientes en el momento de su emisión. No es posible — ni
                    recomendable — modificar un documento ya entregado a un alumno.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="admin-card" style={{ maxWidth: '640px' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="edit-name" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                        Nombre de la plantilla
                    </label>
                    <input
                        id="edit-name"
                        type="text"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        required
                        disabled={saving}
                        className="form-input"
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="edit-abbr" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                        Abreviatura del curso
                    </label>
                    <input
                        id="edit-abbr"
                        type="text"
                        value={formAbbr}
                        onChange={e => setFormAbbr(e.target.value.toUpperCase())}
                        required
                        disabled={saving}
                        maxLength={10}
                        className="form-input"
                        style={{ width: '100%', textTransform: 'uppercase', fontFamily: 'monospace' }}
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Forma parte del número de certificado (ej. {formAbbr || 'XX'}-00001).
                        Cambiarla NO renombra los certificados ya emitidos.
                    </small>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="edit-format" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                        Formato de papel
                    </label>
                    <select
                        id="edit-format"
                        value={formPaperFormat}
                        onChange={e => setFormPaperFormat(e.target.value)}
                        disabled={saving}
                        className="form-input"
                        style={{ width: '100%' }}
                    >
                        {PAPER_FORMAT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="edit-file" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                        Reemplazar PDF base (opcional)
                    </label>
                    <input
                        id="edit-file"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        disabled={saving}
                    />
                    <small style={{ display: 'block', marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Sube un nuevo PDF si necesitas actualizar el diseño (logo nuevo, datos del curso, etc.).
                        Si las dimensiones del PDF nuevo son distintas, las posiciones del nombre y el QR se
                        resetearán a defaults — tendrás que reposicionarlas después.
                    </small>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/certificados')}
                        disabled={saving}
                        style={{ padding: '0.6rem 1.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary"
                        style={{ padding: '0.6rem 1.6rem' }}
                    >
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
};
