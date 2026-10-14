import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CertificateGateway, CertificateSearchFilters } from '../../gateways/CertificateGateway';
import { useCertificateSearch } from '../../hooks/useCertificateSearch';
import { useSelection } from '../../hooks/useSelection';
import { useToast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CertificateSearchFiltersForm } from '../../components/CertificateSearchFiltersForm';
import { parseCalendarDate } from '../../lib/calendar-date';
import { pluralize } from '../../lib/pluralize';

interface Props {
    gateway: CertificateGateway;
}

const SEARCH_DELAY_MS = 300;
// Mirrors the backend's ArrayMaxSize on batch download and delete.
const MAX_BATCH = 100;

const certificateCount = (n: number) => pluralize(n, 'certificado', 'certificados');

export const SearchCertificatesPage: React.FC<Props> = ({ gateway }) => {
    const navigate = useNavigate();
    const toast = useToast();
    const {
        certificates,
        courses,
        loading,
        error,
        search,
        deleteCertificates,
        downloadCertificates,
    } = useCertificateSearch(gateway);
    const selection = useSelection(certificates);

    const [filters, setFilters] = useState<CertificateSearchFilters>({});
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => search(filters), SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [filters, search]);

    const { selected } = selection;
    const overLimit = selected.length > MAX_BATCH;
    const linkedToAccount = selected.filter(c => c.userId).length;
    const hasFilters = Object.values(filters).some(Boolean);

    const handleDownload = async () => {
        setBusy(true);
        try {
            await downloadCertificates(selected.map(c => c.id));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo descargar');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        setBusy(true);
        try {
            await deleteCertificates(selected.map(c => c.id));
            toast.success(selected.length === 1
                ? 'Certificado eliminado.'
                : `${certificateCount(selected.length)} eliminados.`);
            selection.clear();
            setConfirmingDelete(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="admin-page">
            <Link to="/admin/certificados" className="back-link">← Volver a Certificados</Link>

            <div className="admin-header">
                <h1>Buscar Certificado</h1>
                <p>Filtra por titular, número, curso, fecha o cuenta. Selecciona varios para descargarlos o eliminarlos.</p>
            </div>

            <CertificateSearchFiltersForm filters={filters} courses={courses} onChange={setFilters} />

            {certificates.length > 0 && (
                <div className="cert-search__toolbar">
                    <label className="cert-search__select-all">
                        <input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} />
                        <span>
                            {selected.length > 0
                                ? `${selected.length} de ${certificateCount(certificates.length)} seleccionados`
                                : certificateCount(certificates.length)}
                        </span>
                    </label>

                    {selected.length > 0 && (
                        <div className="cert-search__actions">
                            {overLimit && (
                                <span className="cert-search__hint">Máximo {MAX_BATCH} a la vez</span>
                            )}
                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={busy || overLimit}
                                onClick={handleDownload}
                            >
                                Descargar
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={busy || overLimit}
                                onClick={() => setConfirmingDelete(true)}
                            >
                                Eliminar
                            </button>
                        </div>
                    )}
                </div>
            )}

            {loading && <p className="cert-search__status">Buscando...</p>}
            {error && <p className="cert-search__error">{error}</p>}

            {!loading && !error && certificates.length === 0 && (
                <div className="admin-empty">
                    {hasFilters ? 'Ningún certificado coincide con estos filtros.' : 'Aún no hay certificados generados.'}
                </div>
            )}

            {certificates.length > 0 && (
                <ul className="cert-search__list">
                    {certificates.map(cert => (
                        <li
                            key={cert.id}
                            className={`cert-search__row ${selection.isSelected(cert.id) ? 'cert-search__row--selected' : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={selection.isSelected(cert.id)}
                                onChange={() => selection.toggle(cert.id)}
                                aria-label={`Seleccionar ${cert.certificateNumber}`}
                            />
                            <span className="cert-search__name">{cert.recipientName}</span>
                            <span className="cert-search__number">{cert.certificateNumber}</span>
                            <span className="cert-search__meta">
                                {parseCalendarDate(cert.certificateDate).toLocaleDateString('es-MX')}
                            </span>
                            <span className="cert-search__meta">{cert.templateSnapshot.name}</span>
                            {cert.userId && <span className="cert-search__badge">Con cuenta</span>}
                            <button
                                type="button"
                                className="cert-search__view"
                                onClick={() => navigate(`/admin/certificados/ver/${cert.id}`)}
                            >
                                Ver
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {confirmingDelete && (
                <ConfirmDialog
                    title={`¿Eliminar ${certificateCount(selected.length)}?`}
                    confirmLabel={`Eliminar ${certificateCount(selected.length)}`}
                    busyLabel="Eliminando..."
                    busy={busy}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmingDelete(false)}
                >
                    <p className="confirm-dialog__text">
                        Se borran el registro y el PDF. <strong>No se puede deshacer</strong>, y los
                        enlaces y códigos QR de estos certificados dejarán de funcionar.
                    </p>
                    {linkedToAccount > 0 && (
                        <p className="confirm-dialog__text">
                            {linkedToAccount === 1
                                ? '1 está ligado a la cuenta de una alumna y desaparecerá de sus certificados.'
                                : `${linkedToAccount} están ligados a cuentas de alumnas y desaparecerán de sus certificados.`}
                        </p>
                    )}
                    <ul className="cert-search__confirm-list">
                        {selected.map(c => (
                            <li key={c.id}>
                                <span className="cert-search__number">{c.certificateNumber}</span>
                                <span>{c.recipientName}</span>
                            </li>
                        ))}
                    </ul>
                </ConfirmDialog>
            )}
        </div>
    );
};
