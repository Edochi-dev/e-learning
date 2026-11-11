import { useEffect, useState } from 'react';
import type { AssignmentSubmission, CorrectionGateway } from '../gateways/CorrectionGateway';
import { hasTranscriptInProgress } from '../lib/transcript';

export interface PollingOptions {
    intervalMs: number;
    /** Tope de consultas por si una transcripción se atasca en el servidor. */
    maxPolls: number;
}

const DEFAULT_POLLING: PollingOptions = { intervalMs: 3000, maxPolls: 60 };

/**
 * La entrega de la alumna en una lección. Mientras alguna transcripción esté en
 * camino, vuelve a consultar cada pocos segundos para que el texto aparezca sin
 * recargar; cuando no queda ninguna pendiente, deja de consultar.
 *
 * Consultar es suficiente: Whisper tarda segundos y solo justo después de una
 * revisión, así que una conexión abierta (WebSocket/SSE) por alumna no se paga.
 */
export function useSubmissionStatus(
    gateway: CorrectionGateway,
    lessonId: string,
    polling: PollingOptions = DEFAULT_POLLING,
) {
    const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        gateway.getMyStatus(lessonId)
            .then((result) => { if (!cancelled) setSubmission(result); })
            .catch(() => { if (!cancelled) setLoadError('Error al cargar el estado de tu entrega.'); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [gateway, lessonId]);

    const waitingForTranscript = hasTranscriptInProgress(submission?.reviews);
    const { intervalMs, maxPolls } = polling;

    useEffect(() => {
        if (!waitingForTranscript) return;
        let cancelled = false;
        let polls = 0;
        let timer: number | undefined;

        // setTimeout encadenado, no setInterval: una consulta lenta nunca se
        // solapa con la siguiente.
        const poll = async () => {
            polls += 1;
            try {
                const fresh = await gateway.getMyStatus(lessonId);
                if (!cancelled) setSubmission(fresh);
            } catch {
                // Un fallo de red puntual no debe borrar lo que ya se ve.
            }
            if (!cancelled && polls < maxPolls) timer = window.setTimeout(poll, intervalMs);
        };
        timer = window.setTimeout(poll, intervalMs);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [waitingForTranscript, gateway, lessonId, intervalMs, maxPolls]);

    return { submission, setSubmission, isLoading, loadError };
}
