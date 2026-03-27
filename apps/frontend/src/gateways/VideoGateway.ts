/**
 * VideoGateway (Frontend) — Contrato para operaciones de video.
 *
 * El VideoPlayer necesita obtener URLs firmadas para reproducir videos
 * protegidos. Este gateway abstrae esa comunicación con el backend.
 */

export interface SignedUrlResponse {
    url: string;
}

export interface VideoGateway {
    /**
     * Obtiene una URL firmada de corta duración para reproducir un video.
     * El backend verifica la cookie JWT y genera un token temporal en la URL.
     */
    getSignedUrl(lessonId: string): Promise<SignedUrlResponse>;
}
