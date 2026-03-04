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
}

export abstract class CertificateGeneratorGateway {
    abstract generate(params: GenerateCertificateParams): Promise<Buffer>;
}
