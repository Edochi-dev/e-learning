import { useState, useEffect, useCallback, useRef } from 'react';
import type {
    Certificate,
    CertificateCourse,
    CertificateGateway,
    CertificateSearchFilters,
} from '../gateways/CertificateGateway';
import { saveBlob } from '../lib/save-blob';

export const useCertificateSearch = (gateway: CertificateGateway) => {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [courses, setCourses] = useState<CertificateCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const lastFilters = useRef<CertificateSearchFilters>({});
    // Typing fires overlapping searches; only the newest may write the results.
    const latestRequest = useRef(0);

    const search = useCallback(async (filters: CertificateSearchFilters) => {
        lastFilters.current = filters;
        const request = ++latestRequest.current;
        setLoading(true);
        try {
            const data = await gateway.searchCertificates(filters);
            if (request !== latestRequest.current) return;
            setCertificates(data);
            setError(null);
        } catch (err) {
            if (request !== latestRequest.current) return;
            setError(err instanceof Error ? err.message : 'Error al buscar certificados');
        } finally {
            if (request === latestRequest.current) setLoading(false);
        }
    }, [gateway]);

    const loadCourses = useCallback(async () => {
        try {
            setCourses(await gateway.listCertificateCourses());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar los cursos');
        }
    }, [gateway]);

    useEffect(() => {
        loadCourses();
    }, [loadCourses]);

    const deleteCertificates = useCallback(async (ids: string[]) => {
        await gateway.deleteCertificates(ids);
        // Deleting the last certificate of a course removes it from the filter.
        await Promise.all([search(lastFilters.current), loadCourses()]);
    }, [gateway, search, loadCourses]);

    const downloadCertificates = useCallback(async (ids: string[]) => {
        const blob = await gateway.downloadBatch(ids);
        saveBlob(blob, ids.length === 1 ? 'certificado.pdf' : 'certificados.zip');
    }, [gateway]);

    return {
        certificates,
        courses,
        loading,
        error,
        search,
        deleteCertificates,
        downloadCertificates,
    };
};
