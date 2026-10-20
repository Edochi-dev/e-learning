import { useState, useEffect } from 'react';
import type { CertificateGateway, Certificate } from '../gateways/CertificateGateway';
import { saveBlob } from '../lib/save-blob';

/** Certificados de la alumna conectada: presenciales y online. */
export const useMyCertificates = (gateway: CertificateGateway) => {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        gateway.getMyCertificates()
            .then(setCertificates)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [gateway]);

    const download = async (certificate: Certificate): Promise<void> => {
        const blob = await gateway.downloadCertificatePdf(certificate.filePath);
        saveBlob(blob, `${certificate.certificateNumber}.pdf`);
    };

    return { certificates, loading, error, download };
};
