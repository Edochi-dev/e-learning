import React from 'react';

interface VideoPlayerProps {
    src: string;
    title: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, title }) => {
    // 1. Detectar si es YouTube
    const isYoutube = src.includes('youtube.com') || src.includes('youtu.be');

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
                    src={src}
                    title={title}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        );
    }

    // 2. Default: HTML5 Video (MP4, WebM, etc.)
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
                src={src}
                controls
                style={{ width: '100%', height: '100%', display: 'block' }}
                title={title}
            >
                Tu navegador no soporta el elemento de video.
            </video>
        </div>
    );
};
