import type { CertificateGateway, CertificateTemplate, Certificate, GeneratedCertificateSummary, TemplateDesign, EditTemplatePayload } from './CertificateGateway';

export class HttpCertificateGateway implements CertificateGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async uploadTemplate(name: string, courseAbbreviation: string, paperFormat: string, file: File): Promise<CertificateTemplate> {
        const body = new FormData();
        body.append('name', name);
        body.append('courseAbbreviation', courseAbbreviation);
        body.append('paperFormat', paperFormat);
        body.append('file', file);

        const res = await fetch(`${this.baseUrl}/admin/certificate-templates`, {
            method: 'POST',
            credentials: 'include',
            body,
        });
        if (!res.ok) throw new Error(`Error al subir plantilla: ${res.statusText}`);
        return res.json();
    }

    async updateTemplate(id: string, payload: EditTemplatePayload, file?: File): Promise<CertificateTemplate> {
        // Siempre enviamos multipart/form-data porque el endpoint del backend
        // está montado con FileInterceptor (acepta tanto JSON-en-form-data como
        // un archivo opcional). Mantener un único content-type simplifica el
        // contrato y evita ramas innecesarias en el cliente.
        const body = new FormData();
        if (payload.name !== undefined) body.append('name', payload.name);
        if (payload.courseAbbreviation !== undefined) body.append('courseAbbreviation', payload.courseAbbreviation);
        if (payload.paperFormat !== undefined) body.append('paperFormat', payload.paperFormat);
        if (file) body.append('file', file);

        const res = await fetch(`${this.baseUrl}/admin/certificate-templates/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            body,
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message ?? `Error al editar plantilla: ${res.statusText}`);
        }
        return res.json();
    }

    async updateTemplateDesign(id: string, design: TemplateDesign): Promise<CertificateTemplate> {
        const res = await fetch(`${this.baseUrl}/admin/certificate-templates/${id}/design`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(design),
        });
        if (!res.ok) throw new Error(`Error al actualizar el diseño: ${res.statusText}`);
        return res.json();
    }

    async listTemplates(): Promise<CertificateTemplate[]> {
        const res = await fetch(`${this.baseUrl}/admin/certificate-templates`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`Error al cargar plantillas: ${res.statusText}`);
        return res.json();
    }

    async getTemplate(id: string): Promise<CertificateTemplate> {
        const res = await fetch(`${this.baseUrl}/admin/certificate-templates/${id}`, {
            credentials: 'include',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? `Error al cargar la plantilla: ${res.statusText}`);
        }
        return res.json();
    }

    async generateBatch(templateId: string, names: string[]): Promise<GeneratedCertificateSummary[]> {
        const res = await fetch(`${this.baseUrl}/admin/certificates/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ templateId, names }),
        });
        if (!res.ok) throw new Error(`Error al generar certificados: ${res.statusText}`);
        return res.json();
    }

    async listCertificates(): Promise<Certificate[]> {
        const res = await fetch(`${this.baseUrl}/admin/certificates`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`Error al cargar certificados: ${res.statusText}`);
        return res.json();
    }

    async searchCertificates(query: string): Promise<Certificate[]> {
        const url = new URL(`${this.baseUrl}/admin/certificates`);
        url.searchParams.set('search', query);
        const res = await fetch(url.toString(), {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`Error al buscar certificados: ${res.statusText}`);
        return res.json();
    }

    async downloadBatch(ids: string[]): Promise<Blob> {
        const res = await fetch(`${this.baseUrl}/admin/certificates/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error(`Error al descargar certificados: ${res.statusText}`);
        return res.blob();
    }

    async deleteTemplate(id: string, certAction?: 'delete' | 'keep'): Promise<void> {
        const url = new URL(`${this.baseUrl}/admin/certificate-templates/${id}`);
        if (certAction) url.searchParams.set('certAction', certAction);
        const res = await fetch(url.toString(), {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? `Error al eliminar plantilla: ${res.statusText}`);
        }
    }

    async deleteCertificate(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/admin/certificates/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? `Error al eliminar certificado: ${res.statusText}`);
        }
    }

    async getCertificate(id: string): Promise<Certificate> {
        const res = await fetch(`${this.baseUrl}/certificates/${id}`);
        if (!res.ok) throw new Error('Certificado no encontrado');
        return res.json();
    }

    async lookupByNumber(certificateNumber: string): Promise<{ id: string }> {
        const url = new URL(`${this.baseUrl}/certificates/lookup`);
        url.searchParams.set('number', certificateNumber);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Certificado no encontrado');
        return res.json();
    }

    async downloadCertificatePdf(filePath: string): Promise<Blob> {
        const res = await fetch(`${this.baseUrl}${filePath}`);
        if (!res.ok) throw new Error('Error al descargar el certificado PDF');
        return res.blob();
    }
}
