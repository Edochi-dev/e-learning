import { useEffect, useRef, useState } from 'react';

interface PdfPagePreviewProps {
    pdf: Blob;
    /** Nombre accesible de la página dibujada. */
    label: string;
}

/**
 * Dibuja la primera página de un PDF en un canvas.
 *
 * No un <iframe>: Chrome en Android no tiene visor de PDF integrado y muestra
 * una caja vacía. pdfjs se importa bajo demanda para no inflar el bundle inicial,
 * y en su build legacy: el moderno usa APIs (Uint8Array.toHex) que teléfonos con
 * iOS < 18.2 o Chrome < 140 no tienen, y esta página la abre cualquiera.
 */
export const PdfPagePreview = ({ pdf, label }: PdfPagePreviewProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let cancelled = false;
        let renderTask: { cancel(): void } | null = null;

        (async () => {
            const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
                import.meta.url,
            ).toString();

            const doc = await pdfjs.getDocument({ data: await pdf.arrayBuffer() }).promise;
            const page = await doc.getPage(1);
            if (cancelled) return;

            // Ancho mostrado × densidad de píxeles para que el texto salga nítido;
            // tope de 2× para no gastar memoria de más en el teléfono.
            const cssWidth = canvas.parentElement?.clientWidth || 800;
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            const scale = (cssWidth / page.getViewport({ scale: 1 }).width) * pixelRatio;
            const viewport = page.getViewport({ scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas });
            renderTask = task;
            await task.promise;
        })().catch((err: unknown) => {
            if (!cancelled && (err as Error).name !== 'RenderingCancelledException') setFailed(true);
        });

        return () => {
            cancelled = true;
            renderTask?.cancel();
        };
    }, [pdf]);

    if (failed) {
        return <p className="pdf-preview__fallback">No se pudo mostrar la vista previa. Puedes descargar el PDF.</p>;
    }
    return <canvas ref={canvasRef} className="pdf-preview__canvas" role="img" aria-label={label} />;
};
