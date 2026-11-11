import type { PushGateway, PushSubscriptionKeys } from './PushGateway';
import type { HttpClient } from '../http/HttpClient';

export class HttpPushGateway implements PushGateway {
    private readonly baseUrl: string;
    private readonly http: HttpClient;

    constructor(baseUrl: string, http: HttpClient) {
        this.baseUrl = baseUrl;
        this.http = http;
    }

    async getPublicKey(): Promise<string | null> {
        const res = await this.http.fetch(`${this.baseUrl}/push/public-key`);
        if (!res.ok) throw new Error('No se pudo consultar la configuración de notificaciones.');
        const { publicKey } = (await res.json()) as { publicKey: string | null };
        return publicKey;
    }

    async subscribe(endpoint: string, keys: PushSubscriptionKeys): Promise<void> {
        const res = await this.http.fetch(`${this.baseUrl}/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint, keys }),
        });
        if (!res.ok) throw new Error('No se pudo registrar este dispositivo para los recordatorios.');
    }
}
