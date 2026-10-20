import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpCertificateGateway } from './HttpCertificateGateway';

const okJson = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) }) as Response;

describe('HttpCertificateGateway', () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([
        ['absoluta', 'http://api.test', 'http://api.test/certificates/lookup'],
        ['relativa (modo teléfono)', '/api', `${window.location.origin}/api/certificates/lookup`],
    ])('lookupByNumber arma la URL con base %s', async (_, baseUrl, expected) => {
        const fetch = vi.fn().mockResolvedValue(okJson({ id: 'c1' }));
        const gateway = new HttpCertificateGateway(baseUrl, { fetch });

        await expect(gateway.lookupByNumber('MEP-00012', 'Ana Pérez')).resolves.toEqual({ id: 'c1' });

        const url = new URL(fetch.mock.calls[0][0]);
        expect(`${url.origin}${url.pathname}`).toBe(expected);
        expect(url.searchParams.get('number')).toBe('MEP-00012');
        expect(url.searchParams.get('name')).toBe('Ana Pérez');
    });
});
