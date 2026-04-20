import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { QrCodeGateway, QrCodeOptions } from './gateways/qr-code.gateway';

/**
 * QrCodeService — Implementación concreta de QrCodeGateway
 *
 * Genera un Buffer PNG del código QR con soporte para:
 *   - Colores personalizados (foreground/background)
 *   - Logo centrado (compositing via Sharp)
 *
 * Error Correction Level H (30%):
 *   El QR usa el nivel más alto de corrección de errores para que el logo
 *   central (que cubre ~22% del área) no impida la lectura. Los escáneres
 *   pueden reconstruir hasta un 30% de módulos perdidos o cubiertos.
 *
 * Flujo de generación:
 *   1. qrcode genera el QR base como PNG con los colores elegidos
 *   2. Si hay logoBuffer → Sharp redimensiona el logo a ~22% del QR
 *      y lo compone centrado sobre el QR
 *   3. El Buffer resultante se incrusta en el PDF del certificado
 */
@Injectable()
export class QrCodeService implements QrCodeGateway {
  private readonly logger = new Logger(QrCodeService.name);

  /**
   * Ruta al logo por defecto (copiado a dist/ via nest-cli.json assets).
   * Se lee una sola vez y se cachea en memoria para evitar I/O repetido.
   */
  private readonly logoPath = path.join(__dirname, 'assets', 'qr-logo.png');
  private cachedLogo: Buffer | null = null;

  async generate(
    url: string,
    pixelSize: number,
    options?: QrCodeOptions,
  ): Promise<Buffer> {
    const fgColor = options?.foregroundColor ?? '#000000';
    const bgColor = options?.backgroundColor ?? '#ffffff';

    // 1. Generar el QR base con colores personalizados y corrección H
    const qrBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      margin: 1,
      width: pixelSize,
      errorCorrectionLevel: 'H',
      color: {
        dark: fgColor,
        light: bgColor,
      },
    });

    // 2. Si hay logo, hacer compositing centrado
    const logoBuffer = options?.logoBuffer ?? (await this.loadDefaultLogo());
    if (!logoBuffer) {
      return qrBuffer;
    }

    return this.compositeLogoOnQr(qrBuffer, logoBuffer, pixelSize);
  }

  /**
   * Carga el logo por defecto desde el filesystem.
   * Lo cachea en memoria tras la primera lectura — el logo no cambia en runtime.
   * Si el archivo no existe, retorna null y el QR se genera sin logo.
   */
  private async loadDefaultLogo(): Promise<Buffer | null> {
    if (this.cachedLogo) return this.cachedLogo;

    if (!fs.existsSync(this.logoPath)) {
      this.logger.warn(
        `Logo no encontrado en ${this.logoPath}. QR se generará sin logo.`,
      );
      return null;
    }

    this.cachedLogo = fs.readFileSync(this.logoPath);
    return this.cachedLogo;
  }

  /**
   * Compone el logo centrado sobre el QR usando Sharp.
   *
   * El logo se redimensiona a ~22% del ancho del QR. Este porcentaje es el
   * sweet spot: visualmente prominente pero dentro del margen de corrección H (30%).
   * Se deja ~8% de margen para asegurar legibilidad incluso con logos complejos.
   */
  private async compositeLogoOnQr(
    qrBuffer: Buffer,
    logoBuffer: Buffer,
    pixelSize: number,
  ): Promise<Buffer> {
    const logoSize = Math.round(pixelSize * 0.22);

    const resizedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Centrar el logo: offset = (tamaño_qr - tamaño_logo) / 2
    const offset = Math.round((pixelSize - logoSize) / 2);

    const result = await sharp(qrBuffer)
      .composite([
        {
          input: resizedLogo,
          top: offset,
          left: offset,
        },
      ])
      .png()
      .toBuffer();

    return result;
  }
}
