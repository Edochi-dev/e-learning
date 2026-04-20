import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
import { QrCodeGateway, QrCodeOptions } from './gateways/qr-code.gateway';

/**
 * QrCodeService — Implementación concreta de QrCodeGateway
 *
 * Genera un Buffer PNG del código QR estilizado con:
 *   - Módulos circulares (dots) en vez de cuadrados pixelados
 *   - Finder patterns (3 esquinas) con bordes redondeados
 *   - Colores personalizados (foreground/background)
 *   - Logo centrado con margen circular limpio
 *
 * Flujo de generación:
 *   1. `qrcode.create()` genera la MATRIZ de módulos (array de 0/1)
 *      — NO genera una imagen, solo la data cruda del QR.
 *   2. node-canvas renderiza la matriz con estilos visuales:
 *      - Módulos normales → ctx.arc() (círculos)
 *      - Finder patterns → roundRect() concéntricos (cuadrados redondeados)
 *   3. Si hay logo → se dibuja centrado con un círculo blanco de margen
 *   4. Se exporta como PNG Buffer que se incrusta en el PDF del certificado
 *
 * Error Correction Level H (30%):
 *   El QR usa el nivel más alto de corrección de errores para que el logo
 *   central (que cubre ~20% del área) no impida la lectura.
 *
 * ¿Por qué no usamos qr-code-styling?
 *   Esa librería está diseñada para browsers (depende del DOM y Canvas API
 *   del browser). Hacer polyfills de self/document/window en Node.js es
 *   frágil y rompe con cada actualización. En cambio, node-canvas provee
 *   el Canvas API nativo en Node.js sin hacks.
 */
@Injectable()
export class QrCodeService implements QrCodeGateway {
  private readonly logger = new Logger(QrCodeService.name);

  private readonly logoPath = path.join(__dirname, 'assets', 'qr-logo.png');
  private cachedLogo: Buffer | null = null;

  async generate(
    url: string,
    pixelSize: number,
    options?: QrCodeOptions,
  ): Promise<Buffer> {
    const fgColor = options?.foregroundColor ?? '#000000';
    const bgColor = options?.backgroundColor ?? '#ffffff';

    // 1. Generar la matriz de módulos (array de 0/1)
    const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
    const moduleCount = qr.modules.size;

    // 2. Configurar canvas
    const margin = Math.round(pixelSize * 0.04);
    const moduleSize = (pixelSize - 2 * margin) / moduleCount;
    const canvas = createCanvas(pixelSize, pixelSize);
    const ctx = canvas.getContext('2d');

    // Fondo con esquinas redondeadas (coherente con los dots y finder patterns)
    const bgRadius = pixelSize * 0.04;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    this.roundRect(ctx, 0, 0, pixelSize, pixelSize, bgRadius);
    ctx.fill();

    // 3. Dibujar módulos normales como círculos (excluyendo finder patterns)
    ctx.fillStyle = fgColor;
    const dotRadius = (moduleSize * 0.82) / 2;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (this.isFinderPattern(row, col, moduleCount)) continue;
        if (!qr.modules.data[row * moduleCount + col]) continue;

        const x = margin + col * moduleSize + moduleSize / 2;
        const y = margin + row * moduleSize + moduleSize / 2;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Dibujar finder patterns estilizados (3 esquinas redondeadas concéntricas)
    const finderPositions = [
      { row: 0, col: 0 },
      { row: 0, col: moduleCount - 7 },
      { row: moduleCount - 7, col: 0 },
    ];

    for (const fp of finderPositions) {
      this.drawStyledFinder(
        ctx,
        margin + fp.col * moduleSize,
        margin + fp.row * moduleSize,
        moduleSize * 7,
        fgColor,
        bgColor,
      );
    }

    // 5. Logo con margen circular limpio
    const logoBuffer = options?.logoBuffer ?? (await this.loadDefaultLogo());
    if (logoBuffer) {
      await this.drawLogoOnCanvas(ctx, logoBuffer, pixelSize, bgColor);
    }

    return canvas.toBuffer('image/png');
  }

  /**
   * Determina si un módulo pertenece a uno de los 3 finder patterns (7x7).
   * Los finder patterns se dibujan aparte con estilo redondeado concéntrico.
   */
  private isFinderPattern(row: number, col: number, size: number): boolean {
    return (
      (row < 7 && col < 7) ||
      (row < 7 && col >= size - 7) ||
      (row >= size - 7 && col < 7)
    );
  }

  /**
   * Dibuja un finder pattern estilizado: 3 cuadrados concéntricos redondeados.
   *
   * Estructura de un finder pattern estándar (7×7 módulos):
   *   ███████    ← cuadrado exterior (marco)
   *   █     █
   *   █ ███ █    ← cuadrado central (dot)
   *   █ ███ █
   *   █ ███ █
   *   █     █
   *   ███████
   *
   * Aquí los renderizamos con esquinas redondeadas para un look moderno.
   */
  private drawStyledFinder(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    x: number,
    y: number,
    totalSize: number,
    fgColor: string,
    bgColor: string,
  ): void {
    const cornerRadius = totalSize * 0.18;

    // Cuadrado exterior (marco redondeado)
    ctx.fillStyle = fgColor;
    ctx.beginPath();
    this.roundRect(ctx, x, y, totalSize, totalSize, cornerRadius);
    ctx.fill();

    // Hueco interior (fondo)
    const innerGap = totalSize / 7;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    this.roundRect(
      ctx,
      x + innerGap,
      y + innerGap,
      totalSize - 2 * innerGap,
      totalSize - 2 * innerGap,
      cornerRadius * 0.6,
    );
    ctx.fill();

    // Cuadrado central (dot sólido redondeado)
    const centerGap = (totalSize * 2) / 7;
    ctx.fillStyle = fgColor;
    ctx.beginPath();
    this.roundRect(
      ctx,
      x + centerGap,
      y + centerGap,
      totalSize - 2 * centerGap,
      totalSize - 2 * centerGap,
      cornerRadius * 0.4,
    );
    ctx.fill();
  }

  /**
   * Dibuja un rectángulo con esquinas redondeadas usando quadraticCurveTo.
   * Canvas 2D no tiene roundRect nativo en node-canvas, así que lo dibujamos manualmente.
   */
  private roundRect(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  /**
   * Dibuja el logo centrado sobre el QR con un margen circular blanco.
   *
   * El círculo blanco "limpia" los módulos que quedan debajo del logo,
   * creando un espacio visual limpio en vez de pegar el logo encima
   * de los dots (que se ve feo y amateur).
   *
   * El logo ocupa ~20% del ancho del QR. Con error correction H (30%),
   * el QR sigue siendo escaneable incluso con esa área cubierta.
   */
  private async drawLogoOnCanvas(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    logoBuffer: Buffer,
    pixelSize: number,
    bgColor: string,
  ): Promise<void> {
    const logo = await loadImage(logoBuffer);
    const logoSize = pixelSize * 0.20;
    const logoPadding = logoSize * 0.25;
    const totalLogoArea = logoSize + logoPadding * 2;

    // Círculo blanco de margen
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(pixelSize / 2, pixelSize / 2, totalLogoArea / 2, 0, Math.PI * 2);
    ctx.fill();

    // Logo centrado
    const logoX = (pixelSize - logoSize) / 2;
    const logoY = (pixelSize - logoSize) / 2;
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
  }

  /**
   * Carga el logo por defecto desde el filesystem.
   * Lo cachea en memoria tras la primera lectura — el logo no cambia en runtime.
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
}
