import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpCorrectionGateway } from './HttpCorrectionGateway';

describe('HttpCorrectionGateway — revisiones con audio', () => {
    const baseUrl = 'http://api.test';
    let fetchMock: ReturnType<typeof vi.fn>;
    let gateway: HttpCorrectionGateway;

    beforeEach(() => {
        fetchMock = vi.fn();
        gateway = new HttpCorrectionGateway(baseUrl, { fetch: fetchMock });
    });

    it('review envía la decisión y el audio como multipart', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'r1' }) });
        const audio = new Blob(['voz'], { type: 'audio/mp4' });

        await expect(gateway.review('sub-1', 'approve', audio)).resolves.toEqual({ id: 'r1' });

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${baseUrl}/corrections/sub-1/review`);
        expect(init.method).toBe('PATCH');
        const body = init.body as FormData;
        expect(body.get('action')).toBe('approve');
        expect((body.get('audio') as File).name).toBe('revision.m4a');
    });

    it('review muestra el mensaje del backend si rechaza el audio', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            statusText: 'Bad Request',
            json: () => Promise.resolve({ message: 'El audio debe durar entre 1 segundo y 2 minutos.' }),
        });

        await expect(gateway.review('sub-1', 'reject', new Blob(['x']))).rejects.toThrow(
            'El audio debe durar entre 1 segundo y 2 minutos.',
        );
    });

    it('getReviewAudio descarga el audio con la sesión', async () => {
        const blob = new Blob(['aac'], { type: 'audio/mp4' });
        fetchMock.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });

        await expect(gateway.getReviewAudio('r1')).resolves.toBe(blob);
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/corrections/reviews/r1/audio`, {
            credentials: 'include',
        });
    });

    it('getMyStatus devuelve null cuando la alumna aún no entrega (body vacío)', async () => {
        fetchMock.mockResolvedValue(new Response('', { status: 200 }));
        await expect(gateway.getMyStatus('l1')).resolves.toBeNull();
    });

    it('getMyStatus devuelve la entrega cuando existe', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 's1' }), { status: 200 }));
        await expect(gateway.getMyStatus('l1')).resolves.toEqual({ id: 's1' });
    });

    it('getReviewAudio explica cuando el audio ya venció', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 403 });
        await expect(gateway.getReviewAudio('r1')).rejects.toThrow('Este audio ya no está disponible.');
    });
});
