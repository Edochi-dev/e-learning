import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { CertificateGateway, CertificateTemplate } from '../../gateways/CertificateGateway';
import { TemplateDesignPicker } from '../../components/TemplateDesignPicker';
import { useToast } from '../../components/Toast';

interface Props {
    gateway: CertificateGateway;
}

/**
 * EditTemplateDesignPage
 *
 * Permite editar el diseño visual completo de una plantilla EXISTENTE:
 * posiciones, tipografías, tamaños, colores, alineaciones y visibilidad de
 * los elementos. NO solo coordenadas — el nombre lo refleja honestamente.
 *
 * A diferencia del flujo de creación (que tiene una fase 1 de subida + una
 * fase 2 de picker), aquí la plantilla ya existe en BD y solo necesitamos
 * editar su diseño.
 *
 * Carga dos cosas en paralelo:
 *   1. Los metadatos de la plantilla (incluyendo nameStyle/qrStyle/dateStyle
 *      actuales) via gateway.getTemplate(id).
 *   2. Los bytes del PDF base via fetch al filePath de la plantilla, para que
 *      pdfjs pueda renderizarlo como canvas de fondo del picker.
 *
 * Luego renderiza <TemplateDesignPicker> en MODO EDICIÓN — pasando los
 * styles actuales como `initialStyles`. El picker los usa para precargar
 * la posición y configuración exacta que el admin guardó la última vez,
 * en lugar de los defaults visuales que usa el flujo de creación.
 *
 * Reusa el MISMO componente que CreateCertificateTemplatePage. La diferencia
 * entre crear y editar se reduce a un único prop opcional (`initialStyles`).
 * Esto es el premio de haber extraído el picker: cero duplicación, una sola
 * implementación que mantener.
 */
export const EditTemplateDesignPage: React.FC<Props> = ({ gateway }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();

    const [template, setTemplate] = useState<CertificateTemplate | null>(null);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        const load = async () => {
            try {
                const tpl = await gateway.getTemplate(id);
                if (cancelled) return;

                // Descargamos el PDF base como Blob para pasárselo al picker.
                // El gateway frontend ya tiene downloadCertificatePdf que hace
                // exactamente esto (fetch + .blob()) — lo reusamos en lugar de
                // duplicar la lógica de fetch.
                const blob = await gateway.downloadCertificatePdf(tpl.filePath);
                if (cancelled) return;

                setTemplate(tpl);
                setPdfBlob(blob);
            } catch (err) {
                if (cancelled) return;
                toast.error(err instanceof Error ? err.message : 'Error al cargar la plantilla');
                navigate('/admin/certificados');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [id, gateway, navigate, toast]);

    if (loading) {
        return (
            <div className="admin-page">
                <p style={{ color: 'var(--text-muted)' }}>Cargando plantilla...</p>
            </div>
        );
    }

    if (!template || !pdfBlob) return null;

    return (
        <div className="admin-page">
            <Link to="/admin/certificados" className="back-link">← Volver al Panel de Certificados</Link>
            <div className="admin-header">
                <h1>Editar diseño</h1>
                <p>Edita la posición, tipografía, tamaño, color y alineación de los elementos sobre "{template.name}".</p>
            </div>

            <TemplateDesignPicker
                template={template}
                pdfSource={pdfBlob}
                initialStyles={{
                    nameStyle: template.nameStyle,
                    qrStyle:   template.qrStyle,
                    dateStyle: template.dateStyle,
                }}
                gateway={gateway}
                onSaved={() => {
                    toast.success('Diseño guardado correctamente');
                    navigate('/admin/certificados');
                }}
            />
        </div>
    );
};
