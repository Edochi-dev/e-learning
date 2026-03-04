import { useState, useEffect } from 'react';
import type { Certificate } from '../gateways/CertificateGateway';
import type { CertificateGateway } from '../gateways/CertificateGateway';

/**
 * useCertificate — Hook para la página pública de verificación de certificado
 */
export const useCertificate = (gateway: CertificateGateway, id: string) => {
    const [certificate, setCertificate] = useState<Certificate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const data = await gateway.getCertificate(id);
                setCertificate(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Certificado no encontrado');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [gateway, id]);

    return { certificate, loading, error };
};
