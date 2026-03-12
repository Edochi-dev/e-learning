import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CertificateGateway } from '../gateways/CertificateGateway';

export function useCertificateLookup(gateway: CertificateGateway) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function lookup(certificateNumber: string) {
        const trimmed = certificateNumber.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);

        try {
            const { id } = await gateway.lookupByNumber(trimmed);
            navigate(`/certificados/${id}`);
        } catch {
            setError('No encontramos un certificado con ese número. Verifica que esté escrito correctamente.');
        } finally {
            setLoading(false);
        }
    }

    return { lookup, loading, error };
}
