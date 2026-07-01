/**
 * smoothScrollToElement — Scroll suave con duración y easing controlados.
 *
 * ¿Por qué no `scrollIntoView({ behavior: 'smooth' })`?
 *   El scroll suave nativo no permite ajustar ni la duración ni la curva de
 *   aceleración. En distancias largas (p. ej. hero → contacto, casi toda la
 *   landing) el navegador lo resuelve de golpe y se siente abrupto.
 *
 * Aquí animamos manualmente con requestAnimationFrame y una curva easeInOutCubic
 * (arranca lento, acelera, frena suave), lo que da una sensación fluida y
 * consistente sin importar la distancia. Usamos el timestamp que rAF pasa al
 * callback, así que no dependemos de relojes externos.
 */

// easeInOutCubic: suave al entrar y al salir.
function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface SmoothScrollOptions {
    /** Píxeles a restar del destino (para compensar el header sticky). */
    offset?: number;
    /** Duración de la animación en ms. */
    duration?: number;
}

export function smoothScrollToElement(
    id: string,
    { offset = 0, duration = 900 }: SmoothScrollOptions = {},
): void {
    const el = document.getElementById(id);
    if (!el) return;

    const startY = window.scrollY;
    const targetY = el.getBoundingClientRect().top + startY - offset;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    let startTime: number | null = null;

    const step = (now: number) => {
        if (startTime === null) startTime = now;
        const t = Math.min((now - startTime) / duration, 1);
        // behavior: 'auto' fuerza el salto instantáneo de cada frame (evita que
        // un `scroll-behavior: smooth` global interfiera con nuestra animación).
        window.scrollTo({ top: startY + distance * easeInOutCubic(t), behavior: 'auto' });
        if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}

/** Alto del header sticky + un pequeño respiro, para el offset del scroll. */
export function getHeaderOffset(): number {
    const header = document.querySelector('.header');
    const height = header ? header.getBoundingClientRect().height : 72;
    return height + 16;
}
