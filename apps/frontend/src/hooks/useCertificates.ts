import { useState, useEffect, useCallback } from 'react';
import type { CertificateGateway, CertificateTemplate, Certificate, GeneratedCertificateSummary, TemplatePositions } from '../gateways/CertificateGateway';

/**
 * useCertificates — Hook para las páginas de admin de certificados
 *
 * Centraliza todo el estado (loading, error, datos) y las operaciones
 * del sistema de certificados. Las páginas admin solo llaman a las funciones
 * que expone este hook.
 */
export const useCertificates = (gateway: CertificateGateway) => {
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
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

    const loadCertificates = useCallback(async () => {
        try {
            setLoading(true);
            const data = await gateway.listCertificates();
            setCertificates(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar certificados');
        } finally {
            setLoading(false);
        }
    }, [gateway]);

    const searchCertificates = useCallback(async (query: string) => {
        try {
            setLoading(true);
            const data = query.trim()
                ? await gateway.searchCertificates(query.trim())
                : await gateway.listCertificates();
            setCertificates(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al buscar certificados');
        } finally {
            setLoading(false);
        }
    }, [gateway]);

    const uploadTemplate = async (name: string, abbreviation: string, paperFormat: string, file: File): Promise<CertificateTemplate> => {
        const template = await gateway.uploadTemplate(name, abbreviation, paperFormat, file);
        setTemplates(prev => [template, ...prev]);
        return template;
    };

    const updatePositions = async (id: string, positions: TemplatePositions): Promise<CertificateTemplate> => {
        const updated = await gateway.updateTemplatePositions(id, positions);
        setTemplates(prev => prev.map(t => t.id === id ? updated : t));
        return updated;
    };

    const generateBatch = async (templateId: string, names: string[]): Promise<GeneratedCertificateSummary[]> => {
        return gateway.generateBatch(templateId, names);
    };

    const downloadBatch = async (ids: string[]): Promise<void> => {
        const blob = await gateway.downloadBatch(ids);
        const isSingle = ids.length === 1;
        const filename = isSingle ? 'certificado.pdf' : 'certificados.zip';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    return {
        templates,
        certificates,
        loading,
        error,
        loadTemplates,
        loadCertificates,
        searchCertificates,
        uploadTemplate,
        updatePositions,
        generateBatch,
        downloadBatch,
    };
};
