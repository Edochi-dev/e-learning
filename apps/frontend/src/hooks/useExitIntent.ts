import { useEffect, useState } from 'react';

/**
 * useExitIntent — avisa una sola vez cuando la visitante da señales de irse.
 *
 * En escritorio la señal es el puntero saliendo por el borde superior, camino
 * de la barra de direcciones o de la X. En táctil no existe ese gesto, así que
 * la señal equivalente es un desplazamiento hacia arriba decidido después de
 * haber bajado: quien vuelve corriendo al inicio suele estar por cerrar.
 */
export function useExitIntent(enabled = true): boolean {
    const [triggered, setTriggered] = useState(false);

    useEffect(() => {
        if (!enabled || triggered) return;

        let lastY = window.scrollY;
        let deepest = 0;

        const fire = () => setTriggered(true);

        const onMouseOut = (e: MouseEvent) => {
            // relatedTarget vacío = el puntero salió de la ventana, no pasó a
            // otro elemento. Sin esa comprobación saltaría con cada hover.
            if (!e.relatedTarget && e.clientY <= 0) fire();
        };

        const onScroll = () => {
            const y = window.scrollY;
            deepest = Math.max(deepest, y);
            const wentDeep = deepest > window.innerHeight;
            const scrolledUpFast = lastY - y > 90;
            if (wentDeep && scrolledUpFast) fire();
            lastY = y;
        };

        document.addEventListener('mouseout', onMouseOut);
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            document.removeEventListener('mouseout', onMouseOut);
            window.removeEventListener('scroll', onScroll);
        };
    }, [enabled, triggered]);

    return triggered;
}
