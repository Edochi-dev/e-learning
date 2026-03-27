import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { VideoGateway } from '../gateways/VideoGateway';

interface VideoPlayerProps {
    src: string;
    title: string;
    lessonId?: string;           // Si se pasa, pide URL firmada al backend
    videoGateway?: VideoGateway; // Gateway para obtener URLs firmadas
    onWatchProgress?: (percent: number) => void;  // Callback: 0-100
}

/**
 * VideoPlayer — Reproductor de video protegido
 *
 * Soporta 3 modos:
 * 1. YouTube/Vimeo → iframe (ya están protegidos por ellos)
 * 2. Video local con lessonId → pide URL firmada al backend
 * 3. Video externo sin lessonId → reproduce directo (fallback)
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, title, lessonId, videoGateway, onWatchProgress }) => {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Tracking de progreso ──────────────────────────────────────────────────
    // Guardamos en un Set los segundos enteros que el usuario realmente vio.
    // Usamos useRef (no useState) porque no necesitamos re-renderizar al acumular
    // segundos — solo importa el valor final cuando llamamos onWatchProgress.
    const watchedSecondsRef = useRef<Set<number>>(new Set());
    const prevTimeRef = useRef<number>(0);

    // Resetear el tracking cada vez que cambia la lección
    useEffect(() => {
        watchedSecondsRef.current = new Set();
        prevTimeRef.current = 0;
        onWatchProgress?.(0);
    }, [lessonId, onWatchProgress]);

    const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        const current = video.currentTime;
        const duration = video.duration;
        if (!duration || duration === 0) return;

        // Solo acreditamos el segundo si el avance fue "natural" (≤ 2 segundos).
        // Un salto mayor indica que el usuario hizo scrubbing: no se acredita.
        const delta = current - prevTimeRef.current;
        if (delta > 0 && delta <= 2) {
            watchedSecondsRef.current.add(Math.floor(current));
        }
        prevTimeRef.current = current;

        const percent = Math.min(100, (watchedSecondsRef.current.size / Math.floor(duration)) * 100);
        onWatchProgress?.(percent);
    }, [onWatchProgress]);

    const handleEnded = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
        // Al terminar el video acreditamos el último segundo explícitamente
        // y reportamos 100% para cubrir videos muy cortos.
        const video = e.currentTarget;
        watchedSecondsRef.current.add(Math.floor(video.duration));
        onWatchProgress?.(100);
    }, [onWatchProgress]);

    // 1. Detectar si es YouTube
    const isYoutube = src.includes('youtube.com') || src.includes('youtu.be');

    useEffect(() => {
        // Si es YouTube o no tiene lessonId, usar src directo
        if (isYoutube || !lessonId) {
            setVideoSrc(src);
            return;
        }

        // Si no hay gateway, no podemos pedir URL firmada
        if (!videoGateway) {
            setVideoSrc(src);
            return;
        }

        // Si es un video local, pedir URL firmada via gateway
        let cancelled = false;

        const fetchSignedUrl = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await videoGateway.getSignedUrl(lessonId);

                if (cancelled) return;

                // Si es URL externa (YouTube, etc.), usar directamente.
                // Si es URL local firmada (/videos/stream?...), el gateway
                // ya sabe cómo construir la URL completa.
                setVideoSrc(data.url);
            } catch (err) {
                if (cancelled) return;
                setError('Error al cargar el video. Intenta de nuevo.');
                console.error('Error fetching signed URL:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchSignedUrl();
        return () => { cancelled = true; };
    }, [lessonId, src, isYoutube, videoGateway]);

    if (isYoutube) {
        return (
            <div className="video-player-container" style={{
                position: 'relative',
                paddingBottom: '56.25%', /* 16:9 Aspect Ratio */
                height: 0,
                backgroundColor: '#000',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <iframe
                    src={videoSrc || src}
                    title={title}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        );
    }

    // Estado de carga
    if (loading) {
        return (
            <div className="video-player-container" style={{
                width: '100%',
                backgroundColor: '#000',
                borderRadius: '16px',
                aspectRatio: '16/9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.1rem',
            }}>
                Cargando video...
            </div>
        );
    }

    // Estado de error
    if (error) {
        return (
            <div className="video-player-container" style={{
                width: '100%',
                backgroundColor: '#1a1a2e',
                borderRadius: '16px',
                aspectRatio: '16/9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e74c3c',
                fontSize: '1rem',
                padding: '2rem',
                textAlign: 'center',
            }}>
                ⚠️ {error}
            </div>
        );
    }

    // 2. Default: HTML5 Video protegido
    return (
        <div className="video-player-container" style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#000',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            aspectRatio: '16/9'
        }}>
            <video
                src={videoSrc || undefined}
                controls
                controlsList="nodownload"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                style={{ width: '100%', height: '100%', display: 'block' }}
                title={title}
            >
                Tu navegador no soporta el elemento de video.
            </video>
        </div>
    );
};
