import * as fs from 'fs';
import * as path from 'path';
import { canSubsetSafely, hasWordAlignedGlyphs } from './font-subsetting';

describe('hasWordAlignedGlyphs', () => {
  it('acepta glifos que empiezan todos en offsets pares', () => {
    expect(hasWordAlignedGlyphs([0, 10, 24, 24, 40])).toBe(true);
  });

  it('rechaza si algún glifo tiene longitud impar', () => {
    expect(hasWordAlignedGlyphs([0, 10, 23, 40])).toBe(false);
  });

  it('rechaza una tabla loca vacía', () => {
    expect(hasWordAlignedGlyphs([])).toBe(false);
  });
});

describe('canSubsetSafely — fuentes incluidas en el proyecto', () => {
  const fontsDir = path.join(__dirname, 'fonts');
  const read = (file: string) => fs.readFileSync(path.join(fontsDir, file));

  it('Allura-Regular se incrusta completa (fontkit la corrompería)', () => {
    expect(canSubsetSafely(read('Allura-Regular.ttf'))).toBe(false);
  });

  const subsettable = fs
    .readdirSync(fontsDir)
    .filter((file) => file.endsWith('.ttf') && file !== 'Allura-Regular.ttf');

  it.each(subsettable)('%s se puede incrustar como subconjunto', (file) => {
    expect(canSubsetSafely(read(file))).toBe(true);
  });
});
