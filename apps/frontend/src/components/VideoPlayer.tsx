import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface VideoPlayerProps {
    src: string;
    title: string;
    lessonId?: string;  // Si se pasa, pide URL firmada al backend
}

/**
 * VideoPlayer — Reproductor de video protegido
 *
 * Soporta 3 modos:
 * 1. YouTube/Vimeo → iframe (ya están protegidos por ellos)
 * 2. Video local con lessonId → pide URL firmada al backend
 * 3. Video externo sin lessonId → reproduce directo (fallback)
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, title, lessonId }) => {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    // 1. Detectar si es YouTube
    const isYoutube = src.includes('youtube.com') || src.includes('youtu.be');

    useEffect(() => {
        // Si es YouTube o no tiene lessonId, usar src directo
        if (isYoutube || !lessonId) {
            setVideoSrc(src);
            return;
        }

        // Si es un video local, pedir URL firmada
        if (!token) {
            setError('Debes iniciar sesión para ver este video');
            return;
        }

        const fetchSignedUrl = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`http://localhost:3000/videos/${lessonId}/signed-url`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('No se pudo obtener el video');
                }

                const data = await response.json();

                // Si es URL externa (YouTube, etc.), usar directamente
                if (data.url.startsWith('http')) {
                    setVideoSrc(data.url);
                } else {
                    // URL firmada local: prefijamos con el backend
                    setVideoSrc(`http://localhost:3000${data.url}`);
                }
            } catch (err) {
                setError('Error al cargar el video. Intenta de nuevo.');
                console.error('Error fetching signed URL:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSignedUrl();
    }, [lessonId, src, token, isYoutube]);

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
                style={{ width: '100%', height: '100%', display: 'block' }}
                title={title}
            >
                Tu navegador no soporta el elemento de video.
            </video>
        </div>
    );
};
