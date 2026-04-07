/**
 * CertificateGateway (Frontend) — Contrato para las operaciones de certificados
 *
 * Define QUÉ operaciones puede hacer el frontend con los certificados.
 * La implementación concreta (HttpCertificateGateway) sabe CÓMO hacerlas via HTTP.
 */

// ── Value Objects de styling ────────────────────────────────────────────
// Agrupan la configuración visual de cada elemento del certificado.
// Almacenados como jsonb en el backend.

export interface NameStyle {
    positionX: number;
    positionY: number;
    fontSize: number;
    color: string;
    fontFamily: string;
    align: 'left' | 'center';
}

export interface QrStyle {
    positionX: number;
    positionY: number;
    size: number;
}

export interface DateStyle {
    show: boolean;
    positionX: number;
    positionY: number;
    fontSize: number;
    color: string;
    fontFamily: string;
    align: 'left' | 'center';
}

export interface CertificateTemplate {
    id: string;
    name: string;
    courseAbbreviation: string;
    filePath: string;
    pageWidth: number;
    pageHeight: number;
    paperFormat: string;
    nameStyle: NameStyle;
    qrStyle: QrStyle;
    dateStyle: DateStyle;
    createdAt: string;
    certificateCount?: number;
}

/**
 * TemplateSnapshot — copia inmutable de los metadatos de la plantilla
 * al momento de emisión del certificado. Esta es la fuente de verdad
 * para mostrar info de plantilla en la UI: NUNCA leer `cert.template`
 * para mostrar al usuario, porque la plantilla viva puede haber sido
 * editada o borrada después de emitir el certificado.
 */
export interface TemplateSnapshot {
    name: string;
    courseAbbreviation: string;
    paperFormat: string;
}

export interface Certificate {
    id: string;
    certificateNumber: string;
    recipientName: string;
    /**
     * Snapshot congelado de la plantilla en el momento de emisión.
     * Úsalo SIEMPRE para mostrar info de plantilla al usuario.
     */
    templateSnapshot: TemplateSnapshot;
    /**
     * Referencia opcional a la plantilla viva. Solo para auditoría
     * (saber si la plantilla todavía existe). NO usar para mostrar
     * datos al usuario — usar templateSnapshot.
     */
    template: CertificateTemplate | null;
    filePath: string;
    issuedAt: string;
}

export interface GeneratedCertificateSummary {
    id: string;
    certificateNumber: string;
    recipientName: string;
}

export interface TemplatePositions {
    nameStyle: NameStyle;
    qrStyle: QrStyle;
    dateStyle: DateStyle;
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
