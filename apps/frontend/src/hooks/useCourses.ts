import { useState, useEffect, useCallback } from 'react';
import type { Course } from '@maris-nails/shared';
import type { CourseGateway } from '../gateways/CourseGateway';

/**
 * useCourses — Carga cursos PAGINADOS y filtrables (búsqueda, categoría, nivel).
 *
 * La página y los filtros son estado interno; cuando cambian, el efecto vuelve
 * a pedir al gateway. Los setters de filtro RESETEAN a la página 1 (un criterio
 * nuevo debe empezar desde el principio, no en una página que quizá ya no existe).
 *
 * Compatibilidad: sigue exponiendo `courses/loading/error` con los mismos
 * nombres, así que HomePage (que solo muestra la primera tanda) no cambia.
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

    // Filtros ('' = sin filtro).
    const [search, setSearchState] = useState('');
    const [category, setCategoryState] = useState('');
    const [level, setLevelState] = useState('');
    const [categories, setCategories] = useState<string[]>([]);

    // Categorías disponibles (una vez). Silencioso si falla: el filtro de
    // categoría simplemente queda vacío, sin romper el catálogo.
    useEffect(() => {
        gateway.getCategories().then(setCategories).catch(() => setCategories([]));
    }, [gateway]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const result = await gateway.findAll(page, limit, {
                    search: search || undefined,
                    category: category || undefined,
                    level: level || undefined,
                });
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
    }, [gateway, page, limit, search, category, level]);

    // Cambiar un filtro reinicia a la página 1. useCallback → identidad estable
    // para que el consumidor (CatalogPage) pueda usarlos en efectos/debounce.
    const setSearch = useCallback((v: string) => { setPage(1); setSearchState(v); }, []);
    const setCategory = useCallback((v: string) => { setPage(1); setCategoryState(v); }, []);
    const setLevel = useCallback((v: string) => { setPage(1); setLevelState(v); }, []);

    // Al menos 1 página aunque no haya cursos, para no mostrar "Página 1 de 0".
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        courses, loading, error,
        page, setPage, total, totalPages, limit,
        search, setSearch, category, setCategory, level, setLevel, categories,
    };
};
