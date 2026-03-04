import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import { CertificateGeneratorGateway, GenerateCertificateParams } from './gateways/certificate-generator.gateway';

/**
 * PdfCertificateGenerator — Implementación concreta de CertificateGeneratorGateway
 *
 * Usa pdf-lib para abrir el PDF plantilla y superponer:
 * - El nombre del destinatario como texto en la posición indicada
 * - El QR como imagen PNG en la posición indicada
 *
 * El sistema de coordenadas de pdf-lib tiene el origen (0,0) en la esquina
 * inferior-izquierda del PDF. Por eso convertimos las coordenadas del frontend
 * (que vienen desde la esquina superior-izquierda) a coordenadas PDF.
 */
@Injectable()
export class PdfCertificateGenerator implements CertificateGeneratorGateway {
    async generate(params: GenerateCertificateParams): Promise<Buffer> {
        const { templatePath, recipientName, qrBuffer, namePosition, fontSize, nameColor, fontFamily, qrPosition, qrSize } = params;

        const templateBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(templateBytes);

        const page = pdfDoc.getPages()[0];
        const { height: pageHeight } = page.getSize();

        // Incrustamos el QR como imagen PNG
        const qrImage = await pdfDoc.embedPng(qrBuffer);

        // Incrustamos la fuente seleccionada.
        // StandardFonts es un enum de pdf-lib. Si el valor no existe, caemos a Helvetica.
        const fontKey = (fontFamily ?? 'Helvetica') as keyof typeof StandardFonts;
        const font = await pdfDoc.embedFont(StandardFonts[fontKey] ?? StandardFonts.Helvetica);

        // Convertimos color hex a RGB normalizado (0-1)
        const color = this.hexToRgb(nameColor);

        // Dibujamos el nombre. pdf-lib usa coordenadas desde la esquina inferior-izquierda,
        // así que invertimos el eje Y: pdfY = pageHeight - frontendY
        page.drawText(recipientName, {
            x: namePosition.x,
            y: pageHeight - namePosition.y - fontSize,
            size: fontSize,
            font,
            color: rgb(color.r, color.g, color.b),
        });

        // Dibujamos el QR. El Y también se invierte y se resta el tamaño del QR
        // para que la esquina superior-izquierda del QR coincida con el punto elegido
        page.drawImage(qrImage, {
            x: qrPosition.x,
            y: pageHeight - qrPosition.y - qrSize,
            width: qrSize,
            height: qrSize,
        });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }

    private hexToRgb(hex: string): { r: number; g: number; b: number } {
        const clean = hex.replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16) / 255;
        const g = parseInt(clean.substring(2, 4), 16) / 255;
        const b = parseInt(clean.substring(4, 6), 16) / 255;
        return { r, g, b };
    }
}
