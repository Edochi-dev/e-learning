import { useState, useEffect, useCallback } from 'react';
import type { EnrollmentGateway, EnrollmentWithProgress } from '../gateways/EnrollmentGateway';
import { useAuth } from '../context/AuthContext';

/**
 * useEnrollments — Hook que gestiona los cursos matriculados del usuario.
 *
 * Responsabilidades:
 *   - Hacer el fetch al montar el componente (o cuando cambia el token/gateway)
 *   - Gestionar los estados loading / error / data
 *   - Exponer una función `refresh` para que la página pueda recargar los datos
 *     (útil después de matricularse en un nuevo curso)
 *
 * ¿Por qué el hook llama a useAuth() internamente?
 *   Porque las matrículas SIEMPRE requieren estar autenticado. No tiene sentido
 *   que la página tenga que pasar el token manualmente cada vez que usa este hook.
 *   El hook sabe que necesita el token y lo toma solo del contexto de auth.
 *
 * Flujo:
 *   MyCoursesPage → useEnrollments(gateway) → gateway.getMyEnrollments(token) → API
 *
 * Si el usuario no está autenticado (token = null), el hook simplemente
 * termina el loading sin hacer fetch. La página está protegida por ProtectedRoute
 * de todos modos, así que esto solo es una segunda capa de seguridad.
 */
export const useEnrollments = (gateway: EnrollmentGateway) => {
    const { token } = useAuth();
    const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // useCallback memoriza la función `fetchEnrollments` para que no se re-cree
    // en cada render. Esto evita que el useEffect se dispare en bucle infinito,
    // porque `fetchEnrollments` es una dependencia de ese useEffect.
    const fetchEnrollments = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const data = await gateway.getMyEnrollments(token);
            setEnrollments(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, [gateway, token]);

    // Se ejecuta la primera vez que el componente aparece en pantalla,
    // y cada vez que cambia el token o el gateway.
    useEffect(() => {
        fetchEnrollments();
    }, [fetchEnrollments]);

    return {
        enrollments,
        loading,
        error,
        // `refresh` permite que la página recargue los datos manualmente,
        // por ejemplo después de matricularse en un nuevo curso.
        refresh: fetchEnrollments,
    };
};
