import React, { useState } from 'react';
import type { CertificateGateway, CertificateTemplate } from '../gateways/CertificateGateway';
import { Dialog } from './Dialog';
import { saveBlob } from '../lib/save-blob';
import { todayCalendarDate } from '../lib/calendar-date';

const MAX_COPIES = 50;

interface Props {
    gateway: CertificateGateway;
    template: CertificateTemplate;
    onClose: () => void;
}

/** Copias de reserva de una plantilla: con la fecha, sin nombre ni QR. */
export const BlankCertificatesDialog: React.FC<Props> = ({ gateway, template, onClose }) => {
    const [certificateDate, setCertificateDate] = useState(todayCalendarDate);
    const [copies, setCopies] = useState('5');
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const copyCount = Number(copies);
    const valid = Boolean(certificateDate) && Number.isInteger(copyCount) && copyCount >= 1 && copyCount <= MAX_COPIES;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valid) return;
        setWorking(true);
        setError(null);
        try {
            const blob = await gateway.downloadBlankCertificates(template.id, certificateDate, copyCount);
            saveBlob(blob, `${template.courseAbbreviation} en blanco ${certificateDate}.pdf`);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron generar los certificados en blanco');
        } finally {
            setWorking(false);
        }
    };

    return (
        <Dialog title="Certificados en blanco" onClose={onClose} closable={!working}>
            <p className="confirm-dialog__text">
                De reserva para <strong>{template.name}</strong>: llevan la fecha, pero no el nombre ni el QR.
                No se pueden verificar, así que después hay que emitirle a cada alumna su certificado válido.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="blank-date">Fecha</label>
                        <input
                            id="blank-date"
                            type="date"
                            value={certificateDate}
                            onChange={e => setCertificateDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="blank-copies">Copias</label>
                        <input
                            id="blank-copies"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_COPIES}
                            step={1}
                            value={copies}
                            onChange={e => setCopies(e.target.value)}
                            required
                        />
                    </div>
                </div>
                {error && <p className="confirm-dialog__error">{error}</p>}
                <div className="confirm-dialog__actions">
                    <button type="button" className="btn-secondary" onClick={onClose} disabled={working}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={working || !valid}>
                        {working ? 'Generando...' : 'Descargar PDF'}
                    </button>
                </div>
            </form>
        </Dialog>
    );
};
