import type { CertificateGateway, CertificateTemplate, Certificate, GeneratedCertificateSummary, TemplatePositions } from './CertificateGateway';

export class HttpCertificateGateway implements CertificateGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async uploadTemplate(name: string, courseAbbreviation: string, file: File, token: string): Promise<CertificateTemplate> {
        const body = new FormData();
        body.append('name', name);
        body.append('courseAbbreviation', courseAbbreviation);
        body.append('file', file);

        const res = await fetch(`${this.baseUrl}/admin/certificate-templates`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body,
        });
        if (!res.ok) throw new Error(`Error al subir plantilla: ${res.statusText}`);
        return res.json();
    }

    async updateTemplatePositions(id: string, positions: TemplatePositions, token: string): Promise<CertificateTemplate> {
        const res = await fetch(`${this.baseUrl}/admin/certificate-templates/${id}/positions`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(positions),
        });
        if (!res.ok) throw new Error(`Error al actualizar posiciones: ${res.statusText}`);
        return res.json();
    }

    async listTemplates(token: string): Promise<CertificateTemplate[]> {
        const res = await fetch(`${this.baseUrl}/admin/certificate-templates`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error al cargar plantillas: ${res.statusText}`);
        return res.json();
    }

    async generateBatch(templateId: string, names: string[], token: string): Promise<GeneratedCertificateSummary[]> {
        const res = await fetch(`${this.baseUrl}/admin/certificates/batch`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId, names }),
        });
        if (!res.ok) throw new Error(`Error al generar certificados: ${res.statusText}`);
        return res.json();
    }

    async listCertificates(token: string): Promise<Certificate[]> {
        const res = await fetch(`${this.baseUrl}/admin/certificates`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error al cargar certificados: ${res.statusText}`);
        return res.json();
    }

    async downloadBatch(ids: string[], token: string): Promise<Blob> {
        const res = await fetch(`${this.baseUrl}/admin/certificates/download`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error(`Error al descargar certificados: ${res.statusText}`);
        return res.blob();
    }

    async getCertificate(id: string): Promise<Certificate> {
        const res = await fetch(`${this.baseUrl}/certificates/${id}`);
        if (!res.ok) throw new Error('Certificado no encontrado');
        return res.json();
    }
}
