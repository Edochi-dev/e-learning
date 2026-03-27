import type { VideoGateway, SignedUrlResponse } from './VideoGateway';

export class HttpVideoGateway implements VideoGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async getSignedUrl(lessonId: string): Promise<SignedUrlResponse> {
        const res = await fetch(`${this.baseUrl}/videos/${lessonId}/signed-url`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('No se pudo obtener el video');
        const data: SignedUrlResponse = await res.json();

        // Si la URL es relativa (local: /videos/stream?...), prefijar con el baseUrl.
        // Si es absoluta (http://...), dejar tal cual.
        if (!data.url.startsWith('http')) {
            data.url = `${this.baseUrl}${data.url}`;
        }

        return data;
    }
}
