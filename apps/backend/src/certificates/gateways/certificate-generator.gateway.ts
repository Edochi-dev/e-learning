import { DateStamp } from '../value-objects';

export interface GenerateCertificateParams {
  /** Buffer del PDF de la plantilla (leído via FileStorageGateway) */
  templatePath: Buffer;
  recipientName: string;
  qrBuffer: Buffer;
  namePosition: { x: number; y: number };
  fontSize: number;
  nameColor: string;
  fontFamily: string;
  qrPosition: { x: number; y: number };
  qrSize: number;
  nameAlign: 'left' | 'center';
  date: DateStamp;
}

export abstract class CertificateGeneratorGateway {
  abstract generate(params: GenerateCertificateParams): Promise<Buffer>;
}
