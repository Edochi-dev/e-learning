import sharp from 'sharp';
import { readJpegInfo } from './jpeg-info';

const jpeg = (options: sharp.JpegOptions, icc = false) => {
  const image = sharp({
    create: { width: 32, height: 32, channels: 3, background: '#a03c78' },
  });
  return (icc ? image.withIccProfile('srgb') : image).jpeg(options).toBuffer();
};

describe('readJpegInfo', () => {
  it.each([60, 75, 90])(
    'estima la calidad %i de un JPEG de libjpeg',
    async (q) => {
      const info = readJpegInfo(await jpeg({ quality: q }));
      expect(info!.estimatedQuality).toBe(q);
    },
  );

  it('distingue croma completo de submuestreado', async () => {
    const full = await jpeg({ chromaSubsampling: '4:4:4' });
    const subsampled = await jpeg({ chromaSubsampling: '4:2:0' });
    expect(readJpegInfo(full)!.fullChroma).toBe(true);
    expect(readJpegInfo(subsampled)!.fullChroma).toBe(false);
  });

  it('detecta un perfil ICC incrustado', async () => {
    expect(readJpegInfo(await jpeg({}, true))!.hasIccProfile).toBe(true);
    expect(readJpegInfo(await jpeg({}))!.hasIccProfile).toBe(false);
  });
});
