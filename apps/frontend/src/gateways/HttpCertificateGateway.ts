import type { CertificateGateway, CertificateTemplate, Certificate, GeneratedCertificateSummary, TemplateDesign, EditTemplatePayload, CertificateRecipient, CertificateSearchFilters, CertificateCourse, DesignSample } from './CertificateGateway';
import type { HttpClient } from '../http/HttpClient';

// NestJS validation errors carry `message` as an array of strings.
async function errorMessage(res: Response, fallback: string): Promise<string> {
    const body = await res.json().catch(() => ({}));
    const message: unknown = body.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
    return `${fallback}: ${res.statusText}`;
}

export class HttpCertificateGateway implements CertificateGateway {
    private readonly baseUrl: string;
    private readonly http: HttpClient;

    constructor(baseUrl: string, http: HttpClient) {
        this.baseUrl = baseUrl;
        this.http = http;
    }

    // Con base relativa (/api, en el modo teléfono del túnel) new URL(texto)
    // lanza: la base del sitio la completa, y una URL absoluta la ignora.
    private url(path: string): URL {
        return new URL(`${this.baseUrl}${path}`, window.location.origin);
    }

    async uploadTemplate(name: string, courseAbbreviation: string, paperFormat: string, file: File): Promise<CertificateTemplate> {
        const body = new FormData();
        body.append('name', name);
        body.append('courseAbbreviation', courseAbbreviation);
        body.append('paperFormat', paperFormat);
        body.append('file', file);

        const res = await this.http.fetch(`${this.baseUrl}/admin/certificate-templates`, {
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

        const res = await this.http.fetch(`${this.baseUrl}/admin/certificate-templates/${id}`, {
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
        const res = await this.http.fetch(`${this.baseUrl}/admin/certificate-templates/${id}/design`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(design),
        });
        if (!res.ok) throw new Error(`Error al actualizar el diseño: ${res.statusText}`);
        return res.json();
    }

    async previewTemplateDesign(id: string, design: TemplateDesign, sample: DesignSample): Promise<Blob> {
        const res = await this.http.fetch(`${this.baseUrl}/admin/certificate-templates/${id}/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ...design, ...sample }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const message = Array.isArray(err.message) ? err.message.join('. ') : err.message;
            throw new Error(message || 'No se pudo generar la vista previa');
        }
        return res.blob();
    }

    async listTemplates(): Promise<CertificateTemplate[]> {
        const res = await this.http.fetch(`${this.baseUrl}/admin/certificate-templates`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`Error al cargar plantillas: ${res.statusText}`);
        return res.json();
    }

    async getTemplate(id: string): Promise<CertificateTemplate> {
        const res = await this.http.fetch(`${this.baseUrl}/admin/certificate-templates/${id}`, {
            credentials: 'include',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? `Error al cargar la plantilla: ${res.statusText}`);
        }
        return res.json();
    }

    async generateBatch(templateId: string, recipients: CertificateRecipient[], certificateDate: string): Promise<GeneratedCertificateSummary[]> {
        const res = await this.http.fetch(`${this.baseUrl}/admin/certificates/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ templateId, recipients, certificateDate }),
        });
        if (!res.ok) throw new Error(`Error al generar certificados: ${res.statusText}`);
        return res.json();
    }

    async getMyCertificates(): Promise<Certificate[]> {
        const res = await this.http.fetch(`${this.baseUrl}/certificates/me`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`Error al cargar tus certificados: ${res.statusText}`);
        return res.json();
    }

    async searchCertificates(filters: CertificateSearchFilters): Promise<Certificate[]> {
        const url = this.url('/admin/certificates');
        for (const [key, value] of Object.entries(filters)) {
            if (value) url.searchParams.set(key, value);
        }
        const res = await this.http.fetch(url.toString(), {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await errorMessage(res, 'Error al buscar certificados'));
        return res.json();
    }

    async listCertificateCourses(): Promise<CertificateCourse[]> {
        const res = await this.http.fetch(`${this.baseUrl}/admin/certificates/courses`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`Error al cargar los cursos: ${res.statusText}`);
        return res.json();
    }

    async downloadBatch(ids: string[]): Promise<Blob> {
        const res = await this.http.fetch(`${this.baseUrl}/admin/certificates/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error(`Error al descargar certificados: ${res.statusText}`);
        return res.blob();
    }

    async deleteTemplate(id: string, certAction?: 'delete' | 'keep'): Promise<void> {
        const url = this.url(`/admin/certificate-templates/${id}`);
        if (certAction) url.searchParams.set('certAction', certAction);
        const res = await this.http.fetch(url.toString(), {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? `Error al eliminar plantilla: ${res.statusText}`);
        }
    }

    async deleteCertificates(ids: string[]): Promise<void> {
        const res = await this.http.fetch(`${this.baseUrl}/admin/certificates/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error(await errorMessage(res, 'Error al eliminar certificados'));
    }

    async getCertificate(id: string): Promise<Certificate> {
        const res = await this.http.fetch(`${this.baseUrl}/certificates/${id}`);
        if (!res.ok) throw new Error('Certificado no encontrado');
        return res.json();
    }

    async lookupByNumber(certificateNumber: string, recipientName: string): Promise<{ id: string }> {
        const url = this.url('/certificates/lookup');
        url.searchParams.set('number', certificateNumber);
        url.searchParams.set('name', recipientName);
        const res = await this.http.fetch(url.toString());
        if (!res.ok) throw new Error('Certificado no encontrado');
        return res.json();
    }

    async downloadCertificatePdf(filePath: string): Promise<Blob> {
        const res = await this.http.fetch(`${this.baseUrl}${filePath}`);
        if (!res.ok) throw new Error('Error al descargar el certificado PDF');
        return res.blob();
    }
}
