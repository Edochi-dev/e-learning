export interface GenerateCertificateParams {
    templatePath: string;
    recipientName: string;
    qrBuffer: Buffer;
    namePosition: { x: number; y: number };
    fontSize: number;
    nameColor: string;
    fontFamily: string;
    qrPosition: { x: number; y: number };
    qrSize: number;
    nameAlign: 'left' | 'center';
    // Fecha de emisión (opcional — solo si la plantilla tiene showDate=true)
    dateText?: string;
    datePosition?: { x: number; y: number };
    dateFontSize?: number;
    dateColor?: string;
    dateFontFamily?: string;
    dateAlign?: 'left' | 'center';
}

export abstract class CertificateGeneratorGateway {
    abstract generate(params: GenerateCertificateParams): Promise<Buffer>;
}
