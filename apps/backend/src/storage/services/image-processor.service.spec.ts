import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { ImageProcessorService } from './image-processor.service';

// 64x48 HEVC-coded HEIC generated for these tests (no third-party image):
// pink (#e84393) with a gold (#CD9E55) top-left quarter, so orientation and
// colour can be checked after conversion. sharp's prebuilt binary cannot
// decode it, exactly like a real iPhone photo.
const HEVC_HEIC = readFileSync(
  join(__dirname, '__fixtures__', 'synthetic-hevc.heic'),
);

async function pixel(jpeg: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(jpeg)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
}

function expectColorNear(actual: number[], expected: number[]): void {
  actual.forEach((channel, i) =>
    expect(Math.abs(channel - expected[i])).toBeLessThanOrEqual(12),
  );
}

describe('ImageProcessorService', () => {
  const service = new ImageProcessorService();

  describe('isHeic', () => {
    it.each(['image/heic', 'image/heif', 'IMAGE/HEIC', 'Image/Heif'])(
      'reconoce %s',
      (mimetype) => expect(service.isHeic(mimetype)).toBe(true),
    );

    it.each(['image/jpeg', 'image/png', 'image/webp', 'image/avif', ''])(
      'no confunde %s con HEIC',
      (mimetype) => expect(service.isHeic(mimetype)).toBe(false),
    );
  });

  describe('convertToJpeg', () => {
    it('convierte una HEIC codificada en HEVC (foto de iPhone) a JPEG', async () => {
      const jpeg = await service.convertToJpeg(HEVC_HEIC);

      const meta = await sharp(jpeg).metadata();
      expect(meta.format).toBe('jpeg');
      expect([meta.width, meta.height]).toEqual([64, 48]);
    });

    it('conserva colores y orientación', async () => {
      const jpeg = await service.convertToJpeg(HEVC_HEIC);

      expectColorNear(await pixel(jpeg, 6, 6), [0xcd, 0x9e, 0x55]);
      expectColorNear(await pixel(jpeg, 57, 41), [0xe8, 0x43, 0x93]);
    });

    it('sigue convirtiendo una HEIF codificada en AV1', async () => {
      const av1Heif = await sharp({
        create: { width: 32, height: 16, channels: 3, background: '#e84393' },
      })
        .heif({ compression: 'av1' })
        .toBuffer();

      const meta = await sharp(await service.convertToJpeg(av1Heif)).metadata();
      expect(meta.format).toBe('jpeg');
      expect([meta.width, meta.height]).toEqual([32, 16]);
    });

    it('rechaza un archivo que no es una imagen', async () => {
      await expect(
        service.convertToJpeg(Buffer.from('esto no es una foto')),
      ).rejects.toThrow();
    });
  });
});
