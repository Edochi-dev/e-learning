/**
 * CertificateGateway (Frontend) — Contrato para las operaciones de certificados
 *
 * Define QUÉ operaciones puede hacer el frontend con los certificados.
 * La implementación concreta (HttpCertificateGateway) sabe CÓMO hacerlas via HTTP.
 */

export interface CertificateTemplate {
    id: string;
    name: string;
    courseAbbreviation: string;
    filePath: string;
    pageWidth: number;
    pageHeight: number;
    namePositionX: number;
    namePositionY: number;
    nameFontSize: number;
    nameColor: string;
    qrPositionX: number;
    qrPositionY: number;
    qrSize: number;
    fontFamily: string;
    paperFormat: string;
    createdAt: string;
    certificateCount?: number;
}

export interface Certificate {
    id: string;
    certificateNumber: string;
    recipientName: string;
    template: CertificateTemplate;
    filePath: string;
    issuedAt: string;
}

export interface GeneratedCertificateSummary {
    id: string;
    certificateNumber: string;
    recipientName: string;
}

export interface TemplatePositions {
    namePositionX: number;
    namePositionY: number;
    nameFontSize: number;
    nameColor: string;
    fontFamily: string;
    qrPositionX: number;
    qrPositionY: number;
    qrSize: number;
}

export interface CertificateGateway {
    // Admin
    uploadTemplate(name: string, courseAbbreviation: string, paperFormat: string, file: File, token: string): Promise<CertificateTemplate>;
    updateTemplatePositions(id: string, positions: TemplatePositions, token: string): Promise<CertificateTemplate>;
    listTemplates(token: string): Promise<CertificateTemplate[]>;
    generateBatch(templateId: string, names: string[], token: string): Promise<GeneratedCertificateSummary[]>;
    listCertificates(token: string): Promise<Certificate[]>;
    searchCertificates(query: string, token: string): Promise<Certificate[]>;
    downloadBatch(ids: string[], token: string): Promise<Blob>;

    deleteTemplate(id: string, token: string, certAction?: 'delete' | 'keep'): Promise<void>;
    deleteCertificate(id: string, token: string): Promise<void>;

    // Público
    getCertificate(id: string): Promise<Certificate>;
}
