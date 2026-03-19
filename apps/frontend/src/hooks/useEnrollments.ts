import { useState, useEffect, useCallback } from 'react';
import type { EnrollmentGateway, EnrollmentWithProgress } from '../gateways/EnrollmentGateway';
import { useAuth } from '../context/AuthContext';

/**
 * useEnrollments — Hook que gestiona los cursos matriculados del usuario.
 *
 * Responsabilidades:
 *   - Hacer el fetch al montar el componente (o cuando cambia el gateway)
 *   - Gestionar los estados loading / error / data
 *   - Exponer una función `refresh` para que la página pueda recargar los datos
 *
 * El JWT viaja automáticamente en una cookie HttpOnly — el hook ya no necesita
 * manejar el token. Solo verifica que el usuario esté autenticado (user !== null)
 * antes de hacer el fetch.
 */
export const useEnrollments = (gateway: EnrollmentGateway) => {
    const { isAuthenticated } = useAuth();
    const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEnrollments = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const data = await gateway.getMyEnrollments();
            setEnrollments(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, [gateway, isAuthenticated]);

    useEffect(() => {
        fetchEnrollments();
    }, [fetchEnrollments]);

    return {
        enrollments,
        loading,
        error,
        refresh: fetchEnrollments,
    };
};
