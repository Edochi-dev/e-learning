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

    it('downloadBatch pide el layout elegido y, sin él, separados', async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob()) } as Response);
        const gateway = new HttpCertificateGateway('http://api.test', { fetch });

        await gateway.downloadBatch(['c1', 'c2'], 'merged');
        await gateway.downloadBatch(['c1', 'c2']);

        expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ ids: ['c1', 'c2'], layout: 'merged' });
        expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ ids: ['c1', 'c2'], layout: 'separate' });
    });

    it('uploadTemplate y updateTemplate muestran por qué el backend rechazó el PDF', async () => {
        const message = 'La plantilla pesa 4,6 MB y el máximo es 900 KB. Expórtala de nuevo más liviana…';
        const fetch = vi.fn().mockResolvedValue({
            ok: false,
            statusText: 'Payload Too Large',
            json: () => Promise.resolve({ statusCode: 413, message }),
        } as Response);
        const gateway = new HttpCertificateGateway('http://api.test', { fetch });
        const file = new File(['%PDF'], 'plantilla.pdf', { type: 'application/pdf' });

        await expect(gateway.uploadTemplate('Curso', 'CU', 'A4 Vertical', file)).rejects.toThrow(message);
        await expect(gateway.updateTemplate('t1', {}, file)).rejects.toThrow(message);
    });

    it('downloadBlankCertificates muestra el mensaje de validación del backend', async () => {
        const fetch = vi.fn().mockResolvedValue({
            ok: false,
            statusText: 'Bad Request',
            json: () => Promise.resolve({ message: ['No se pueden generar más de 50 copias a la vez'] }),
        } as Response);
        const gateway = new HttpCertificateGateway('http://api.test', { fetch });

        await expect(gateway.downloadBlankCertificates('t1', '2026-11-07', 51))
            .rejects.toThrow('No se pueden generar más de 50 copias a la vez');
        expect(fetch.mock.calls[0][0]).toBe('http://api.test/admin/certificate-templates/t1/blank');
    });
});
