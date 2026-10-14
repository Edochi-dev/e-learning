import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import decodeHeic from 'heic-decode';

const JPEG_QUALITY = 85;

/**
 * Image conversions for uploads. Today it turns HEIC/HEIF photos (the iPhone
 * default) into JPEG so the teacher can review them in any browser.
 */
@Injectable()
export class ImageProcessorService {
  isHeic(mimetype: string): boolean {
    const normalized = mimetype.toLowerCase();
    return normalized === 'image/heic' || normalized === 'image/heif';
  }

  /**
   * sharp's prebuilt libvips ships without HEVC (patent licensing), so it
   * reads AV1-based HEIF but fails on iPhone photos, which are HEVC. Those
   * fall back to heic-decode (libheif in WebAssembly). Do not drop the
   * fallback after upgrading sharp: no prebuilt release includes HEVC.
   */
  async convertToJpeg(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer).jpeg({ quality: JPEG_QUALITY }).toBuffer();
    } catch {
      const { width, height, data } = await decodeHeic({ buffer });
      return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
        raw: { width, height, channels: 4 },
      })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
    }
  }
}
