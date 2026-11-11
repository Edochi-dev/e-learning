import { useEffect, useState } from 'react';

/**
 * useAnyVisible — dice si alguno de los elementos que casan con el selector
 * está en pantalla ahora mismo.
 *
 * Sirve para que un elemento fijo se aparte cuando su equivalente dentro del
 * contenido ya es visible: dos copias del mismo botón a la vez no insisten,
 * estorban. Consulta el DOM dentro del efecto, igual que useScrollReveal.
 *
 * Arranca en `true` porque al cargar la página el botón del encabezado está a
 * la vista: así lo fijo no asoma para esconderse un instante después.
 */
export function useAnyVisible(selector: string): boolean {
    const [anyVisible, setAnyVisible] = useState(true);

    useEffect(() => {
        const els = Array.from(document.querySelectorAll(selector));
        if (els.length === 0) return;

        // Sin IntersectionObserver se queda en `true`: el elemento fijo no
        // aparece nunca, que es preferible a que se quede pegado encima.
        if (!('IntersectionObserver' in window)) return;

        const visible = new Set<Element>();
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) visible.add(entry.target);
                else visible.delete(entry.target);
            });
            setAnyVisible(visible.size > 0);
        });

        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [selector]);

    return anyVisible;
}
