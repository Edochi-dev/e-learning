import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionRefreshingHttpClient } from './SessionRefreshingHttpClient';

const API = 'http://api.test';
const res = (status: number) => ({ status, ok: status >= 200 && status < 300 }) as Response;

describe('SessionRefreshingHttpClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let client: SessionRefreshingHttpClient;

    const calls = () => fetchMock.mock.calls.map(([url]) => String(url));

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        client = new SessionRefreshingHttpClient(API);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('envía las cookies de sesión y devuelve tal cual una respuesta que no es 401', async () => {
        fetchMock.mockResolvedValue(res(200));

        const response = await client.fetch(`${API}/courses`, { method: 'GET' });

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith(`${API}/courses`, {
            credentials: 'include',
            method: 'GET',
        });
    });

    it('ante un 401 renueva la sesión y reintenta la petición original', async () => {
        fetchMock
            .mockResolvedValueOnce(res(401))
            .mockResolvedValueOnce(res(204))
            .mockResolvedValueOnce(res(200));

        const response = await client.fetch(`${API}/enrollments/me`);

        expect(response.status).toBe(200);
        expect(calls()).toEqual([
            `${API}/enrollments/me`,
            `${API}/users/refresh`,
            `${API}/enrollments/me`,
        ]);
    });

    it('varias peticiones que fallan a la vez comparten una sola renovación', async () => {
        fetchMock.mockImplementation((url: string) =>
            Promise.resolve(
                url.endsWith('/users/refresh') ? res(204) : res(fetchMock.mock.calls.length <= 3 ? 401 : 200),
            ),
        );

        await Promise.all([
            client.fetch(`${API}/a`),
            client.fetch(`${API}/b`),
            client.fetch(`${API}/c`),
        ]);

        expect(calls().filter((url) => url.endsWith('/users/refresh'))).toHaveLength(1);
    });

    it('si la renovación falla, avisa que la sesión terminó y devuelve el 401 original', async () => {
        const expired = vi.fn();
        client.onSessionExpired(expired);
        fetchMock.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(401));

        const response = await client.fetch(`${API}/users/me`);

        expect(response.status).toBe(401);
        expect(expired).toHaveBeenCalledTimes(1);
        expect(calls()).toHaveLength(2);
    });

    it('si la renovación da error de red, también da la sesión por terminada', async () => {
        const expired = vi.fn();
        client.onSessionExpired(expired);
        fetchMock.mockResolvedValueOnce(res(401)).mockRejectedValueOnce(new TypeError('offline'));

        expect((await client.fetch(`${API}/users/me`)).status).toBe(401);
        expect(expired).toHaveBeenCalled();
    });

    it('reintenta una sola vez: un segundo 401 se devuelve sin entrar en bucle', async () => {
        fetchMock
            .mockResolvedValueOnce(res(401))
            .mockResolvedValueOnce(res(204))
            .mockResolvedValueOnce(res(401));

        expect((await client.fetch(`${API}/admin/x`)).status).toBe(401);
        expect(calls()).toHaveLength(3);
    });

    it.each(['/users/login', '/users/refresh', '/users/logout'])(
        'un 401 de %s no dispara renovación',
        async (path) => {
            fetchMock.mockResolvedValue(res(401));

            expect((await client.fetch(`${API}${path}`, { method: 'POST' })).status).toBe(401);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        },
    );

    it('deja de avisar a quien canceló su suscripción', async () => {
        const expired = vi.fn();
        const unsubscribe = client.onSessionExpired(expired);
        unsubscribe();
        fetchMock.mockResolvedValue(res(401));

        await client.fetch(`${API}/users/me`);
        expect(expired).not.toHaveBeenCalled();
    });
});
