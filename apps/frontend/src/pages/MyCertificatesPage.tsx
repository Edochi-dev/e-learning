import { Award } from 'lucide-react';
import type { CertificateGateway, Certificate } from '../gateways/CertificateGateway';
import { useMyCertificates } from '../hooks/useMyCertificates';
import { useToast } from '../components/Toast';
import { parseCalendarDate } from '../lib/calendar-date';

interface MyCertificatesPageProps {
    gateway: CertificateGateway;
}

const longDate = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'long', year: 'numeric' });

/**
 * Todos los certificados de la alumna. Página propia y no dentro de "Mis
 * cursos": la mayoría vienen de cursos presenciales que no existen en la plataforma.
 */
export const MyCertificatesPage = ({ gateway }: MyCertificatesPageProps) => {
    const { certificates, loading, error, download } = useMyCertificates(gateway);
    const toast = useToast();

    const handleDownload = (certificate: Certificate) =>
        download(certificate).catch(() => toast.error('No se pudo descargar el certificado.'));

    const subtitle = () => {
        if (loading || error) return null;
        if (certificates.length === 0) return 'Aún no tienes certificados';
        return `${certificates.length} certificado${certificates.length === 1 ? '' : 's'}`;
    };

    return (
        <div className="container my-certificates-page">
            <div className="my-courses-page__header">
                <h1>Mis certificados</h1>
                <p className="my-courses-page__subtitle">{subtitle()}</p>
            </div>

            {loading && <p className="my-certificates-page__status">Cargando…</p>}

            {!loading && error && (
                <p className="my-certificates-page__status">No se pudieron cargar tus certificados.</p>
            )}

            {!loading && !error && certificates.length === 0 && (
                <div className="my-courses-page__empty">
                    <Award className="my-certificates-page__empty-icon" aria-hidden />
                    <h2>Tus logros aparecerán aquí</h2>
                    <p>Cuando la profesora emita un certificado a tu nombre, lo podrás descargar desde esta página.</p>
                </div>
            )}

            {!loading && !error && certificates.length > 0 && (
                <ul className="certificate-list">
                    {certificates.map((certificate) => (
                        <li key={certificate.id} className="certificate-list__item">
                            <Award className="certificate-list__icon" aria-hidden />
                            <div className="certificate-list__info">
                                <p className="certificate-list__name">
                                    {certificate.templateSnapshot?.name ?? 'Certificado'}
                                </p>
                                <p className="certificate-list__meta">
                                    {certificate.certificateNumber} · {longDate.format(parseCalendarDate(certificate.certificateDate))}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn-secondary certificate-list__download"
                                onClick={() => handleDownload(certificate)}
                            >
                                Descargar PDF
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
