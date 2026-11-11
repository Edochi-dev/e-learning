import { useCallback, useEffect, useRef, useState } from 'react';
import { pickRecordingMimeType } from '../lib/audio-recording';

export type RecorderStatus = 'idle' | 'starting' | 'recording' | 'recorded';

export interface Recording {
    blob: Blob;
    /** Object URL para escucharla antes de enviarla. */
    url: string;
}

/**
 * Graba una nota de voz con el micrófono (MediaRecorder) y la detiene sola al
 * llegar a `maxSeconds`. Suelta el micrófono al terminar o al desmontarse, para
 * que el navegador apague el indicador de grabación.
 */
export function useAudioRecorder(maxSeconds: number) {
    const [status, setStatus] = useState<RecorderStatus>('idle');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [recording, setRecording] = useState<Recording | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);
    const urlRef = useRef<string | null>(null);

    const releaseMicrophone = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    const revokeUrl = useCallback(() => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
    }, []);

    const stop = useCallback(() => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    }, []);

    const start = useCallback(async () => {
        setError(null);
        revokeUrl();
        setRecording(null);
        setElapsedSeconds(0);

        if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setError('Este navegador no permite grabar audio. Prueba con Chrome o Safari actualizados.');
            return;
        }
        const mimeType = pickRecordingMimeType((type) => MediaRecorder.isTypeSupported(type));

        setStatus('starting');
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            setStatus('idle');
            setError('Necesitamos permiso para usar el micrófono. Actívalo en tu navegador e inténtalo de nuevo.');
            return;
        }
        streamRef.current = stream;

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onstop = () => {
            releaseMicrophone();
            const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
            const url = URL.createObjectURL(blob);
            urlRef.current = url;
            setRecording({ blob, url });
            setStatus('recorded');
        };
        recorderRef.current = recorder;

        const startedAt = Date.now();
        timerRef.current = window.setInterval(() => {
            const seconds = (Date.now() - startedAt) / 1000;
            setElapsedSeconds(Math.min(seconds, maxSeconds));
            if (seconds >= maxSeconds) stop();
        }, 250);

        recorder.start();
        setStatus('recording');
    }, [maxSeconds, releaseMicrophone, revokeUrl, stop]);

    /** Descarta la grabación (o la que está en curso) y vuelve al inicio. */
    const reset = useCallback(() => {
        const recorder = recorderRef.current;
        if (recorder?.state === 'recording') {
            recorder.onstop = null;
            recorder.stop();
        }
        recorderRef.current = null;
        releaseMicrophone();
        revokeUrl();
        setRecording(null);
        setElapsedSeconds(0);
        setStatus('idle');
    }, [releaseMicrophone, revokeUrl]);

    useEffect(() => () => {
        const recorder = recorderRef.current;
        if (recorder?.state === 'recording') {
            recorder.onstop = null;
            recorder.stop();
        }
        releaseMicrophone();
        revokeUrl();
    }, [releaseMicrophone, revokeUrl]);

    return { status, elapsedSeconds, recording, error, start, stop, reset };
}
