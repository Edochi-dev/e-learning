import { useEffect, type DependencyList } from 'react';

/**
 * useScrollReveal — Revela con fade + slide-up los elementos con clase `.reveal`
 * a medida que entran en el viewport, usando IntersectionObserver.
 *
 * Cómo se usa: llamar en la página y poner la clase `reveal` en los elementos
 * que deben animarse al bajar. El observer los marca `.reveal--visible` cuando
 * aparecen y deja de observarlos (la animación ocurre una sola vez).
 *
 * `deps`: por defecto observa lo presente al montar. Si el contenido llega por
 * fetch (p. ej. las cards del catálogo), pasa una dependencia que cambie cuando
 * el contenido esté renderizado (p. ej. `[loading]`) para re-observar entonces.
 */
export function useScrollReveal(deps: DependencyList = []): void {
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
        // deps es intencional: la página decide cuándo re-observar (ej. [loading]).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
