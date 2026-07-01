import { useState, useEffect } from 'react';
import type { Course } from '@maris-nails/shared';
import type { CourseGateway } from '../gateways/CourseGateway';

/**
 * useCourses — Carga cursos de forma PAGINADA y expone el estado de la página.
 *
 * La página se maneja como estado interno (`page`); cuando cambia, el efecto
 * vuelve a pedir esa página al gateway. Así el consumidor solo llama a
 * `setPage(n)` y el hook se encarga de recargar.
 *
 * Compatibilidad: sigue exponiendo `courses/loading/error` con los mismos
 * nombres de antes, así que las páginas que solo muestran la primera tanda
 * (p. ej. HomePage) no necesitan cambiar nada; simplemente ignoran los campos
 * de paginación nuevos.
 *
 * @param gateway  implementación del contrato de cursos (inyectada)
 * @param limit    tamaño de página (por defecto 12, igual que el backend)
 */
export const useCourses = (gateway: CourseGateway, limit = 12) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [page, setPage] = useState<number>(1);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const result = await gateway.findAll(page, limit);
                setCourses(result.data);
                setTotal(result.total);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [gateway, page, limit]);

    // Al menos 1 página aunque no haya cursos, para no mostrar "Página 1 de 0".
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return { courses, loading, error, page, setPage, total, totalPages, limit };
};
