import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, rgb, RGB, StandardFonts } from 'pdf-lib';
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
 * Renderizado de texto char-by-char:
 *   pdf-lib con fuentes custom (TTF) tiene un bug conocido donde ciertos visores de PDF
 *   (Chrome, Adobe) usan la tabla de anchos interna del TTF (`hmtx`) en vez del array
 *   `/W` del descriptor CIDFont. Si estos anchos no coinciden, el texto se ve separado
 *   (ej: "Maria" → "Mari a"). Para evitarlo, cada carácter se dibuja en su propia
 *   coordenada X explícita, calculada sumando los anchos de pdf-lib uno a uno.
 *   Así el visor no puede "adivinar" mal la posición — la recibe explícita.
 *
 * El sistema de coordenadas de pdf-lib tiene el origen (0,0) en la esquina
 * inferior-izquierda del PDF. Por eso convertimos las coordenadas del frontend
 * (que vienen desde la esquina superior-izquierda) a coordenadas PDF.
 */
@Injectable()
export class PdfCertificateGenerator implements CertificateGeneratorGateway {
  private readonly logger = new Logger(PdfCertificateGenerator.name);

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
    font: PDFFont,
  ): number {
    if (align === 'center') {
      return anchorX - font.widthOfTextAtSize(text, size) / 2;
    }
    return anchorX;
  }

  /**
   * Dibuja texto carácter por carácter con posición X explícita.
   *
   * ¿Por qué no usar page.drawText(texto_completo)?
   * Cuando pdf-lib embebe una fuente custom (TTF) con subset: false, la fuente
   * queda en el PDF con dos tablas de anchos: el array /W (de fontkit) y la
   * tabla hmtx interna del TTF. Algunos visores usan hmtx en vez de /W,
   * y si difieren → se generan gaps fantasma entre letras.
   *
   * Al dibujar char-by-char, cada carácter recibe una coordenada X explícita
   * via un operador de posicionamiento (Td/Tm). El visor DEBE respetar esa
   * coordenada — no puede "adivinar" usando anchos internos.
   *
   * Para fuentes StandardFonts (Helvetica, etc.) este bug no existe porque
   * no tienen un programa TTF embebido, así que usamos drawText normal.
   */
  private drawTextCharByChar(
    page: PDFPage,
    text: string,
    options: { x: number; y: number; size: number; font: PDFFont; color: RGB },
  ): void {
    let currentX = options.x;
    for (const char of text) {
      page.drawText(char, {
        x: currentX,
        y: options.y,
        size: options.size,
        font: options.font,
        color: options.color,
      });
      currentX += options.font.widthOfTextAtSize(char, options.size);
    }
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

    // templatePath ahora es un Buffer (leído por el Use Case via FileStorageGateway).
    // Antes era una ruta del filesystem, lo cual filtraba detalles de infraestructura
    // al generador de PDFs. PDFDocument.load() acepta Buffer directamente.
    const pdfDoc = await PDFDocument.load(templatePath);

    const page = pdfDoc.getPages()[0];
    const { height: pageHeight } = page.getSize();

    // Incrustamos el QR como imagen PNG
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    // Incrustamos la fuente: primero intentamos fuente custom TTF, luego StandardFonts
    const { font, isCustom } = await this.embedFont(
      pdfDoc,
      fontFamily ?? 'Helvetica',
    );

    // Convertimos color hex a RGB normalizado (0-1)
    const color = this.hexToRgb(nameColor);

    // Fuentes caligráficas (Great Vibes, Dancing Script…) tienen em_height > lineHeight
    // en CSS, por lo que el texto desborda hacia arriba del element box.
    // Usar heightAtSize como offset coloca el baseline de modo que el tope visual
    // del texto quede en el borde superior del element box en el PDF,
    // coincidiendo con el comportamiento de CSS para estas fuentes.
    const nameAscender = font.heightAtSize(fontSize, { descender: false });
    const nameDrawX = this.resolveDrawX(
      namePosition.x,
      nameAlign,
      recipientName,
      fontSize,
      font,
    );
    const nameDrawY = pageHeight - namePosition.y - nameAscender;
    const nameRgb = rgb(color.r, color.g, color.b);

    // Fuentes custom → char-by-char para evitar gaps por discrepancia hmtx vs /W.
    // StandardFonts → drawText normal (no tienen el bug).
    if (isCustom) {
      this.drawTextCharByChar(page, recipientName, {
        x: nameDrawX,
        y: nameDrawY,
        size: fontSize,
        font,
        color: nameRgb,
      });
    } else {
      page.drawText(recipientName, {
        x: nameDrawX,
        y: nameDrawY,
        size: fontSize,
        font,
        color: nameRgb,
      });
    }

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
      const { font: dateFont, isCustom: isDateCustom } = await this.embedFont(
        pdfDoc,
        dateFontFamily ?? 'Helvetica',
      );
      const dateRgb = this.hexToRgb(dateColor ?? '#000000');
      const dateDrawX = this.resolveDrawX(
        datePosition.x,
        dateAlign ?? 'left',
        dateText,
        dateFontSize,
        dateFont,
      );
      const dateDrawY = pageHeight - datePosition.y - dateFontSize;
      const dateRgbColor = rgb(dateRgb.r, dateRgb.g, dateRgb.b);

      if (isDateCustom) {
        this.drawTextCharByChar(page, dateText, {
          x: dateDrawX,
          y: dateDrawY,
          size: dateFontSize,
          font: dateFont,
          color: dateRgbColor,
        });
      } else {
        page.drawText(dateText, {
          x: dateDrawX,
          y: dateDrawY,
          size: dateFontSize,
          font: dateFont,
          color: dateRgbColor,
        });
      }
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
   *
   * Retorna { font, isCustom } para que el caller sepa si debe usar char-by-char.
   */
  private async embedFont(
    pdfDoc: PDFDocument,
    fontFamily: string,
  ): Promise<{ font: PDFFont; isCustom: boolean }> {
    // 1. ¿Es una fuente estándar de pdf-lib?
    if (fontFamily in StandardFonts) {
      const fontKey = fontFamily as keyof typeof StandardFonts;
      return {
        font: await pdfDoc.embedFont(StandardFonts[fontKey]),
        isCustom: false,
      };
    }

    // 2. ¿Existe el archivo TTF custom?
    const ttfPath = path.join(this.fontsDir, `${fontFamily}.ttf`);
    // Verificar que el path resultante no salga del directorio de fuentes
    if (!ttfPath.startsWith(this.fontsDir)) {
      return {
        font: await pdfDoc.embedFont(StandardFonts.Helvetica),
        isCustom: false,
      };
    }
    if (fs.existsSync(ttfPath)) {
      try {
        // Registramos fontkit para que pdf-lib pueda incrustar fuentes custom.
        // subset: false evita que el subsetting reconstruya las tablas de glifos
        // incorrectamente en fuentes OpenType complejas (caligráficas, con ligaduras).
        pdfDoc.registerFontkit(fontkit);
        const fontBytes = fs.readFileSync(ttfPath);
        return {
          font: await pdfDoc.embedFont(fontBytes, { subset: false }),
          isCustom: true,
        };
      } catch (error) {
        // Si el archivo TTF está corrupto o tiene un formato no soportado,
        // logueamos el error y caemos al fallback en vez de romper toda la generación.
        this.logger.warn(
          `No se pudo cargar la fuente "${fontFamily}": ${error.message}. Usando Helvetica.`,
        );
      }
    }

    // 3. Fallback
    return {
      font: await pdfDoc.embedFont(StandardFonts.Helvetica),
      isCustom: false,
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return { r, g, b };
  }
}
