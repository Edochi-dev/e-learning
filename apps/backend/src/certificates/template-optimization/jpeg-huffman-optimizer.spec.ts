import sharp from 'sharp';
import { optimizeJpegHuffman } from './jpeg-huffman-optimizer';

/** Imagen con bordes y degradados para que los coeficientes no sean triviales. */
async function sampleJpeg(options: sharp.JpegOptions, channels: 1 | 3 = 3) {
  const width = 96;
  const height = 64;
  const pixels = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < channels; c++) {
        pixels[(y * width + x) * channels + c] =
          (x * 7 + y * 3 + c * 50 + ((x ^ y) & 16) * 4) & 255;
      }
    }
  }
  return sharp(pixels, { raw: { width, height, channels } })
    .jpeg(options)
    .toBuffer();
}

const decode = (jpeg: Uint8Array) => sharp(Buffer.from(jpeg)).raw().toBuffer();

describe('optimizeJpegHuffman', () => {
  it.each([
    ['color 4:2:0', { chromaSubsampling: '4:2:0' }, 3],
    ['color 4:4:4', { chromaSubsampling: '4:4:4' }, 3],
    ['escala de grises', {}, 1],
  ] as const)(
    '%s: mismos píxeles con menos bytes que las tablas estándar',
    async (_, options, channels) => {
      const original = await sampleJpeg(
        { quality: 92, optimiseCoding: false, ...options },
        channels,
      );

      const optimized = optimizeJpegHuffman(original);

      expect(optimized).not.toBeNull();
      expect(optimized!.length).toBeLessThan(original.length);
      expect((await decode(optimized!)).equals(await decode(original))).toBe(
        true,
      );
    },
  );

  it('no toca un JPEG progresivo', async () => {
    const progressive = await sampleJpeg({ progressive: true });
    expect(optimizeJpegHuffman(progressive)).toBeNull();
  });

  it('devuelve null con datos que no son un JPEG válido', async () => {
    const original = await sampleJpeg({ optimiseCoding: false });
    expect(optimizeJpegHuffman(Buffer.from('no es un jpeg'))).toBeNull();
    expect(optimizeJpegHuffman(original.subarray(0, 400))).toBeNull();
  });
});
