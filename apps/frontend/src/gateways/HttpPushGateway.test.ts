import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpPushGateway } from './HttpPushGateway';

describe('HttpPushGateway', () => {
    const baseUrl = 'http://api.test';
    let fetchMock: ReturnType<typeof vi.fn>;
    let gateway: HttpPushGateway;

    beforeEach(() => {
        fetchMock = vi.fn();
        gateway = new HttpPushGateway(baseUrl, { fetch: fetchMock });
    });

    it('getPublicKey devuelve la clave VAPID del servidor', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ publicKey: 'BKey' }) });

        await expect(gateway.getPublicKey()).resolves.toBe('BKey');
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/push/public-key`);
    });

    it('getPublicKey devuelve null si el servidor no tiene push configurado', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ publicKey: null }) });

        await expect(gateway.getPublicKey()).resolves.toBeNull();
    });

    it('subscribe envía el endpoint y las claves con la forma que espera el backend', async () => {
        fetchMock.mockResolvedValue({ ok: true });

        await gateway.subscribe('https://push.example/abc', { p256dh: 'p', auth: 'a' });

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${baseUrl}/push/subscribe`);
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body)).toEqual({
            endpoint: 'https://push.example/abc',
            keys: { p256dh: 'p', auth: 'a' },
        });
    });

    it('subscribe falla si el servidor rechaza la suscripción (no se reporta un éxito falso)', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 400 });

        await expect(gateway.subscribe('e', { p256dh: 'p', auth: 'a' })).rejects.toThrow();
    });
});
