import { useEffect } from 'react';

/**
 * useScrollReveal — Revela con fade + slide-up los elementos con clase `.reveal`
 * a medida que entran en el viewport, usando IntersectionObserver.
 *
 * Cómo se usa: llamar una vez en la página y poner la clase `reveal` en las
 * secciones que deben animarse al bajar. El observer las marca `.reveal--visible`
 * cuando aparecen y deja de observarlas (la animación ocurre una sola vez).
 *
 * Se observan los `.reveal` presentes al montar; por eso conviene ponerlo en
 * elementos SIEMPRE renderizados (secciones), no en listas que llegan por fetch.
 */
export function useScrollReveal(): void {
    useEffect(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
        if (els.length === 0) return;

        // Fallback: si no hay IntersectionObserver, mostramos todo sin animar.
        if (!('IntersectionObserver' in window)) {
            els.forEach((el) => el.classList.add('reveal--visible'));
            return;
        }

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('reveal--visible');
                        io.unobserve(entry.target); // una sola vez
                    }
                });
            },
            // Dispara un poco antes de que la sección esté del todo dentro.
            { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
        );

        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);
}
