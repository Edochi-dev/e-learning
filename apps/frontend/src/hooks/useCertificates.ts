import { useState, useEffect, useCallback } from 'react';
import type { CertificateGateway, CertificateTemplate, GeneratedCertificateSummary, CertificateRecipient } from '../gateways/CertificateGateway';
import { saveBlob } from '../lib/save-blob';

/**
 * useCertificates — Hook para las páginas de admin de certificados
 *
 * Centraliza todo el estado (loading, error, datos) y las operaciones
 * del sistema de certificados. Las páginas admin solo llaman a las funciones
 * que expone este hook.
 */
export const useCertificates = (gateway: CertificateGateway) => {
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTemplates = useCallback(async () => {
        try {
            setLoading(true);
            const data = await gateway.listTemplates();
            setTemplates(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar plantillas');
        } finally {
            setLoading(false);
        }
    }, [gateway]);

    const uploadTemplate = async (name: string, abbreviation: string, paperFormat: string, file: File): Promise<CertificateTemplate> => {
        const template = await gateway.uploadTemplate(name, abbreviation, paperFormat, file);
        setTemplates(prev => [template, ...prev]);
        return template;
    };

    const generateBatch = async (templateId: string, recipients: CertificateRecipient[], certificateDate?: string): Promise<GeneratedCertificateSummary[]> => {
        return gateway.generateBatch(templateId, recipients, certificateDate);
    };

    const downloadBatch = async (ids: string[]): Promise<void> => {
        const blob = await gateway.downloadBatch(ids);
        saveBlob(blob, ids.length === 1 ? 'certificado.pdf' : 'certificados.zip');
    };

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    return {
        templates,
        loading,
        error,
        loadTemplates,
        uploadTemplate,
        generateBatch,
        downloadBatch,
    };
};
