import type { VideoGateway, SignedUrlResponse } from './VideoGateway';
import type { HttpClient } from '../http/HttpClient';

export class HttpVideoGateway implements VideoGateway {
    private readonly baseUrl: string;
    private readonly http: HttpClient;

    constructor(baseUrl: string, http: HttpClient) {
        this.baseUrl = baseUrl;
        this.http = http;
    }

    async getSignedUrl(lessonId: string): Promise<SignedUrlResponse> {
        const res = await this.http.fetch(`${this.baseUrl}/videos/${lessonId}/signed-url`, {
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
