import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import {
  CertificateGeneratorGateway,
  GenerateCertificateParams,
} from './gateways/certificate-generator.gateway';

// fontkit permite incrustar fuentes TTF/OTF custom en los PDFs generados por pdf-lib.
// Usamos require() porque @pdf-lib/fontkit es un módulo CJS y su export por defecto
// es el objeto fontkit directamente.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fontkitModule = require('@pdf-lib/fontkit');
const fontkit = fontkitModule.default ?? fontkitModule;

/**
 * PdfCertificateGenerator — Implementación concreta de CertificateGeneratorGateway
 *
 * Usa pdf-lib para abrir el PDF plantilla y superponer:
 * - El nombre del destinatario como texto en la posición indicada
 * - El QR como imagen PNG en la posición indicada
 *
 * Soporte de fuentes:
 * - Si fontFamily coincide con una clave de StandardFonts de pdf-lib → se usa directamente.
 * - De lo contrario, se busca el archivo `<fontFamily>.ttf` en la carpeta `fonts/`
 *   junto a este archivo compilado (copiada allí por nest-cli.json assets).
 * - Si el archivo no existe, cae a Helvetica como último recurso.
 *
 * El sistema de coordenadas de pdf-lib tiene el origen (0,0) en la esquina
 * inferior-izquierda del PDF. Por eso convertimos las coordenadas del frontend
 * (que vienen desde la esquina superior-izquierda) a coordenadas PDF.
 */
@Injectable()
export class PdfCertificateGenerator implements CertificateGeneratorGateway {
  // Ruta a la carpeta de fuentes TTF (se copia de src/ a dist/ via nest-cli.json assets)
  private readonly fontsDir = path.join(__dirname, 'fonts');

  /**
   * Calcula el X real de dibujo según la alineación elegida.
   * 'left'   → anchorX es el borde izquierdo del texto (pdf-lib estándar)
   * 'center' → anchorX es el centro; desplazamos la mitad del ancho del texto
   *            para que el centro del texto caiga exactamente en anchorX
   */
  private resolveDrawX(
    anchorX: number,
    align: 'left' | 'center',
    text: string,
    size: number,
    font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  ): number {
    if (align === 'center') {
      return anchorX - font.widthOfTextAtSize(text, size) / 2;
    }
    return anchorX;
  }

  async generate(params: GenerateCertificateParams): Promise<Buffer> {
    const {
      templatePath,
      recipientName,
      qrBuffer,
      namePosition,
      fontSize,
      nameColor,
      fontFamily,
      nameAlign,
      qrPosition,
      qrSize,
      dateText,
      datePosition,
      dateFontSize,
      dateColor,
      dateFontFamily,
      dateAlign,
    } = params;

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const page = pdfDoc.getPages()[0];
    const { height: pageHeight } = page.getSize();

    // Incrustamos el QR como imagen PNG
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    // Incrustamos la fuente: primero intentamos fuente custom TTF, luego StandardFonts
    const font = await this.embedFont(pdfDoc, fontFamily ?? 'Helvetica');

    // Convertimos color hex a RGB normalizado (0-1)
    const color = this.hexToRgb(nameColor);

    // Fuentes caligráficas (Great Vibes, Dancing Script…) tienen em_height > lineHeight
    // en CSS, por lo que el texto desborda hacia arriba del element box.
    // Usar heightAtSize como offset coloca el baseline de modo que el tope visual
    // del texto quede en el borde superior del element box en el PDF,
    // coincidiendo con el comportamiento de CSS para estas fuentes.
    const nameAscender = font.heightAtSize(fontSize, { descender: false });
    page.drawText(recipientName, {
      x: this.resolveDrawX(
        namePosition.x,
        nameAlign,
        recipientName,
        fontSize,
        font,
      ),
      y: pageHeight - namePosition.y - nameAscender,
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

    // Si la plantilla tiene fecha activada, la superponemos con su propia fuente
    if (dateText && datePosition && dateFontSize) {
      const dateFont = await this.embedFont(
        pdfDoc,
        dateFontFamily ?? 'Helvetica',
      );
      const dateRgb = this.hexToRgb(dateColor ?? '#000000');
      page.drawText(dateText, {
        x: this.resolveDrawX(
          datePosition.x,
          dateAlign ?? 'left',
          dateText,
          dateFontSize,
          dateFont,
        ),
        y: pageHeight - datePosition.y - dateFontSize,
        size: dateFontSize,
        font: dateFont,
        color: rgb(dateRgb.r, dateRgb.g, dateRgb.b),
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Intenta incrustar una fuente en el PDFDocument.
   *
   * Orden de prioridad:
   * 1. Si fontFamily es una clave válida de StandardFonts → la usa directamente.
   * 2. Si existe el archivo `<fontFamily>.ttf` en la carpeta fonts/ → la incrusta con fontkit.
   * 3. Fallback: Helvetica (StandardFonts).
   */
  private async embedFont(pdfDoc: PDFDocument, fontFamily: string) {
    // 1. ¿Es una fuente estándar de pdf-lib?
    if (fontFamily in StandardFonts) {
      const fontKey = fontFamily as keyof typeof StandardFonts;
      return pdfDoc.embedFont(StandardFonts[fontKey]);
    }

    // 2. ¿Existe el archivo TTF custom?
    const ttfPath = path.join(this.fontsDir, `${fontFamily}.ttf`);
    // Verificar que el path resultante no salga del directorio de fuentes
    if (!ttfPath.startsWith(this.fontsDir)) {
      return pdfDoc.embedFont(StandardFonts.Helvetica);
    }
    if (fs.existsSync(ttfPath)) {
      // Registramos fontkit para que pdf-lib pueda incrustar fuentes custom.
      // subset: false evita que el subsetting reconstruya las tablas de glifos
      // incorrectamente en fuentes OpenType complejas (caligráficas, con ligaduras),
      // lo que causaba que algunos caracteres aparecieran separados (ej: "Fabiol a").
      pdfDoc.registerFontkit(fontkit);
      const fontBytes = fs.readFileSync(ttfPath);
      return pdfDoc.embedFont(fontBytes, { subset: false });
    }

    // 3. Fallback
    return pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return { r, g, b };
  }
}
