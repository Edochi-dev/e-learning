import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

/**
 * ImageProcessorService — Servicio de infraestructura para procesamiento de imágenes.
 *
 * Vive en el módulo de storage porque es una preocupación de infraestructura,
 * no de dominio. Si mañana necesitamos procesar imágenes de perfil, thumbnails
 * automáticos, etc., este servicio se reutiliza sin duplicar lógica.
 *
 * Actualmente solo hace conversión HEIC→JPEG porque las alumnas usan iPhone
 * y iOS produce fotos en HEIC por defecto. Sin esta conversión, la profesora
 * necesitaría un visor especial para revisar las fotos — fricción innecesaria.
 */
@Injectable()
export class ImageProcessorService {
  /**
   * Determina si un archivo es HEIC/HEIF basándose en su mimetype.
   *
   * iOS envía 'image/heic' o 'image/heif'. Algunos clientes pueden
   * enviar variantes con mayúsculas, así que normalizamos a lowercase.
   */
  isHeic(mimetype: string): boolean {
    const normalized = mimetype.toLowerCase();
    return normalized === 'image/heic' || normalized === 'image/heif';
  }

  /**
   * Convierte un buffer de imagen HEIC/HEIF a JPEG.
   *
   * sharp maneja la decodificación automáticamente — detecta el formato
   * del input por los magic bytes, no por el mimetype.
   *
   * Quality 85 es el sweet spot: visualmente indistinguible de 100
   * pero ~40% más liviano. Para fotos de nail art donde la profesora
   * necesita ver detalle, 85 es más que suficiente.
   */
  async convertToJpeg(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).jpeg({ quality: 85 }).toBuffer();
  }
}
