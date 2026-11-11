import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CertificateGateway } from '../gateways/CertificateGateway';

export function useCertificateLookup(gateway: CertificateGateway) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function lookup(certificateNumber: string, recipientName: string) {
        const numero = certificateNumber.trim();
        const nombre = recipientName.trim();
        if (!numero || !nombre) return;

        setLoading(true);
        setError(null);

        try {
            const { id } = await gateway.lookupByNumber(numero, nombre);
            navigate(`/certificados/${id}`);
        } catch {
            // Un solo mensaje para los dos fallos posibles, igual que el backend
            // devuelve un solo error: decir cuál de los dos campos falló
            // revelaría qué números están emitidos.
            setError('No encontramos ese certificado. Revisa que el número y el nombre estén escritos como aparecen en el documento.');
        } finally {
            setLoading(false);
        }
    }

    return { lookup, loading, error };
}
