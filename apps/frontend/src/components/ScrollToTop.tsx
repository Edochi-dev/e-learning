import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — Lleva el scroll al inicio en cada cambio de ruta.
 *
 * En una SPA, React Router NO resetea el scroll al navegar: conserva la posición
 * de la página anterior. Por eso, al pasar de una página scrolleada (p. ej. la
 * landing) a otra, la nueva "arranca abajo". Cada página debe empezar arriba.
 *
 * Excepción: si venimos con intención de ir a una sección concreta
 * (state.scrollTo, p. ej. el botón "Contacto"), no forzamos el tope — de eso se
 * encarga el scroll suave hacia esa sección.
 *
 * Usamos behavior: 'instant' porque hay un `scroll-behavior: smooth` global; sin
 * esto, cada navegación animaría el scroll hasta arriba (lento y raro).
 */
export function ScrollToTop() {
    const { pathname, state } = useLocation();

    useEffect(() => {
        if ((state as { scrollTo?: string } | null)?.scrollTo) return;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname, state]);

    return null;
}
