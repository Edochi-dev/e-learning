import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoProvider } from '@maris-nails/shared';
import type { VideoGateway } from '../gateways/VideoGateway';
import { playedSegments } from '../lib/watched-segments';

interface VideoPlayerProps {
    title: string;
    lessonId: string;
    provider: VideoProvider;
    videoGateway: VideoGateway;
    /** Segmentos vistos en esta sesión; `flush` = momento de guardarlos ya (pausa, fin). */
    onWatchedSegments?: (segments: number[], flush: boolean) => void;
}

/**
 * Plays a lesson's video. The URL never travels with the course data: it is
 * requested per lesson from the enrollment-checked signed-url endpoint, which
 * returns an embeddable link for YouTube and a signed stream for hosted files.
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ title, lessonId, provider, videoGateway, onWatchedSegments }) => {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Segmentos vistos en la lección, acumulados: renovar el enlace cambia el
    // src y el navegador reinicia `played`, pero lo ya visto no se pierde.
    const watchedRef = useRef<Set<number>>(new Set());
    const reportedCountRef = useRef(0);

    // El enlace firmado vence (VIDEO_TOKEN_EXPIRY_HOURS) y el servidor valida cada
    // tramo que pide el video: tras una pausa larga, el siguiente tramo falla.
    const resumeRef = useRef<{ time: number; play: boolean } | null>(null);
    const renewalsRef = useRef<number[]>([]);

    useEffect(() => {
        watchedRef.current = new Set();
        reportedCountRef.current = 0;
        resumeRef.current = null;
        renewalsRef.current = [];
    }, [lessonId]);

    const report = useCallback((video: HTMLVideoElement, flush: boolean) => {
        for (const s of playedSegments(video.played, video.duration)) watchedRef.current.add(s);
        const size = watchedRef.current.size;
        if (size > reportedCountRef.current || (flush && size > 0)) {
            reportedCountRef.current = size;
            onWatchedSegments?.([...watchedRef.current].sort((a, b) => a - b), flush);
        }
    }, [onWatchedSegments]);

    // Pide un enlace nuevo y retoma en el mismo segundo. Con tope: un archivo
    // realmente dañado no debe quedar renovando en bucle.
    const handleMediaError = useCallback(async (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        const now = Date.now();
        renewalsRef.current = renewalsRef.current.filter((t) => now - t < 60_000);
        if (renewalsRef.current.length >= 2) {
            setError('No se pudo reproducir el video. Revisa tu conexión y recarga la página.');
            return;
        }
        renewalsRef.current.push(now);
        report(video, true);
        resumeRef.current = { time: video.currentTime, play: !video.paused };
        try {
            const { url } = await videoGateway.getSignedUrl(lessonId);
            setVideoSrc(url);
        } catch {
            setError('Error al cargar el video. Intenta de nuevo.');
        }
    }, [lessonId, videoGateway, report]);

    const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
        const resume = resumeRef.current;
        if (!resume) return;
        resumeRef.current = null;
        const video = e.currentTarget;
        video.currentTime = resume.time;
        if (resume.play) video.play().catch(() => { /* el navegador exige un toque: queda en pausa */ });
    }, []);

    const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
        report(e.currentTarget, false);
    }, [report]);

    const handleFlush = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
        report(e.currentTarget, true);
    }, [report]);

    const isYoutube = provider === VideoProvider.YOUTUBE;

    useEffect(() => {
        let cancelled = false;
        setVideoSrc(null);

        const fetchSignedUrl = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await videoGateway.getSignedUrl(lessonId);

                if (cancelled) return;

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
    }, [lessonId, videoGateway]);

    if (isYoutube && videoSrc) {
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
                    src={videoSrc}
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
                onPause={handleFlush}
                onEnded={handleFlush}
                onError={handleMediaError}
                onLoadedMetadata={handleLoadedMetadata}
                style={{ width: '100%', height: '100%', display: 'block' }}
                title={title}
            >
                Tu navegador no soporta el elemento de video.
            </video>
        </div>
    );
};
