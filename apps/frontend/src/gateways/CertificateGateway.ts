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
    nameAlign: 'left' | 'center';
    paperFormat: string;
    showDate: boolean;
    datePositionX: number;
    datePositionY: number;
    dateFontSize: number;
    dateColor: string;
    dateFontFamily: string;
    dateAlign: 'left' | 'center';
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
    nameAlign: 'left' | 'center';
    qrPositionX: number;
    qrPositionY: number;
    qrSize: number;
    showDate: boolean;
    datePositionX: number;
    datePositionY: number;
    dateFontSize: number;
    dateColor: string;
    dateFontFamily: string;
    dateAlign: 'left' | 'center';
}

export interface CertificateGateway {
    // Admin
    uploadTemplate(name: string, courseAbbreviation: string, paperFormat: string, file: File): Promise<CertificateTemplate>;
    updateTemplatePositions(id: string, positions: TemplatePositions): Promise<CertificateTemplate>;
    listTemplates(): Promise<CertificateTemplate[]>;
    generateBatch(templateId: string, names: string[]): Promise<GeneratedCertificateSummary[]>;
    listCertificates(): Promise<Certificate[]>;
    searchCertificates(query: string): Promise<Certificate[]>;
    downloadBatch(ids: string[]): Promise<Blob>;

    deleteTemplate(id: string, certAction?: 'delete' | 'keep'): Promise<void>;
    deleteCertificate(id: string): Promise<void>;

    // Público
    getCertificate(id: string): Promise<Certificate>;
    lookupByNumber(certificateNumber: string): Promise<{ id: string }>;

    /**
     * Descarga el PDF de un certificado como Blob.
     *
     * Las páginas necesitan el PDF como Blob para:
     *   - Descarga programática (crear <a> con blob URL)
     *   - Vista previa en iframe (evita bloqueo CSP de frame-ancestors)
     *
     * Recibe el filePath relativo que viene en el objeto Certificate.
     * La implementación concreta sabe cómo construir la URL completa.
     */
    downloadCertificatePdf(filePath: string): Promise<Blob>;
}
