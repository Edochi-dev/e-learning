import { useEffect, useRef, useState } from 'react';

/**
 * useCountUp — anima un número de 0 al valor final cuando el elemento entra
 * en pantalla. Devuelve la ref que hay que colgar del nodo y el valor a pintar.
 *
 * Arranca al ser visible y no al montar: si contara mientras la sección está
 * fuera del viewport, la visitante llegaría con la animación ya terminada.
 */
export function useCountUp(target: number, durationMs = 1600): [React.RefObject<HTMLSpanElement | null>, number] {
    const ref = useRef<HTMLSpanElement | null>(null);
    const [value, setValue] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el || target === 0) return;

        let frame = 0;

        const run = () => {
            const start = performance.now();
            const tick = (now: number) => {
                const progress = Math.min((now - start) / durationMs, 1);
                // easeOutCubic: arranca rápido y frena al final, que es lo que
                // hace que el número "aterrice" en vez de cortarse en seco.
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(Math.round(target * eased));
                if (progress < 1) frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        };

        // Sin IntersectionObserver no hay forma de saber cuándo entra en
        // pantalla: se planta el valor final y se renuncia a la animación.
        // Va dentro de un frame porque asignar estado de forma síncrona en el
        // cuerpo del efecto encadena renders (react-hooks/set-state-in-effect).
        if (!('IntersectionObserver' in window)) {
            frame = requestAnimationFrame(() => setValue(target));
            return () => cancelAnimationFrame(frame);
        }

        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    io.disconnect();
                    run();
                }
            },
            { threshold: 0.4 },
        );

        io.observe(el);
        return () => {
            io.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [target, durationMs]);

    return [ref, value];
}
