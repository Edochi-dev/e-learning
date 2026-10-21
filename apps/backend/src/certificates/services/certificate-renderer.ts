import { Injectable } from '@nestjs/common';
import { CertificateGeneratorGateway } from '../gateways/certificate-generator.gateway';
import { QrCodeGateway } from '../gateways/qr-code.gateway';
import { NameStyle } from '../value-objects/name-style.vo';
import { QrStyle } from '../value-objects/qr-style.vo';
import { DateStyle } from '../value-objects/date-style.vo';
import { CertificateDate, createDateStamp } from '../value-objects';

export interface CertificateDesign {
  nameStyle: NameStyle;
  qrStyle: QrStyle;
  dateStyle: DateStyle;
}

export interface RenderCertificateParams {
  templatePdf: Buffer;
  design: CertificateDesign;
  recipientName: string;
  verificationUrl: string;
  date: CertificateDate;
}

/**
 * Dibuja un certificado (QR + nombre + fecha sobre la plantilla). Lo usan la
 * emisión y la vista previa del diseñador: por eso la vista previa no puede
 * diferir de lo que se imprime.
 */
@Injectable()
export class CertificateRenderer {
  constructor(
    private readonly qrGateway: QrCodeGateway,
    private readonly generatorGateway: CertificateGeneratorGateway,
  ) {}

  async render({
    templatePdf,
    design,
    recipientName,
    verificationUrl,
    date,
  }: RenderCertificateParams): Promise<Buffer> {
    const { nameStyle, qrStyle, dateStyle } = design;

    // qrStyle.size está en puntos PDF (1/72 pulgada): a 300 DPI, px = pts / 72 * 300.
    const pixelSize = Math.ceil((qrStyle.size / 72) * 300);
    const qrBuffer = await this.qrGateway.generate(verificationUrl, pixelSize, {
      foregroundColor: qrStyle.foregroundColor,
      backgroundColor: qrStyle.backgroundColor,
    });

    return this.generatorGateway.generate({
      templatePath: templatePdf,
      recipientName,
      qrBuffer,
      namePosition: { x: nameStyle.positionX, y: nameStyle.positionY },
      fontSize: nameStyle.fontSize,
      nameColor: nameStyle.color,
      fontFamily: nameStyle.fontFamily ?? 'Helvetica',
      nameAlign: nameStyle.align ?? 'left',
      qrPosition: { x: qrStyle.positionX, y: qrStyle.positionY },
      qrSize: qrStyle.size,
      date: createDateStamp(dateStyle, date),
    });
  }
}
