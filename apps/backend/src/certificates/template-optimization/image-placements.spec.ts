import { findImagePlacements } from './image-placements';

describe('findImagePlacements', () => {
  it('mide el tamaño dibujado con las matrices acumuladas', () => {
    const content = `
      q 0.5 0 0 0.5 0 0 cm
        q 1190.4 0 0 1683.84 0 0 cm /Im0 Do Q
      Q
      q 100 0 0 50 10 20 cm /Im1 Do Q`;

    const placements = findImagePlacements(content)!;

    expect(placements.get('Im0')).toEqual([
      { widthPts: 595.2, heightPts: 841.92 },
    ]);
    expect(placements.get('Im1')).toEqual([{ widthPts: 100, heightPts: 50 }]);
  });

  it('ignora texto con paréntesis, arreglos y diccionarios', () => {
    const content = `BT /F1 12 Tf (a) Tj [(b \\) c) 20 (d)] TJ ET
      /Span << /MCID 0 >> BDC q 72 0 0 72 0 0 cm /Logo Do Q EMC`;

    expect(findImagePlacements(content)!.get('Logo')).toEqual([
      { widthPts: 72, heightPts: 72 },
    ]);
  });

  it('usa el tamaño real aunque la imagen esté girada', () => {
    const placements = findImagePlacements('q 0 300 -200 0 0 0 cm /Im0 Do Q')!;
    expect(placements.get('Im0')).toEqual([{ widthPts: 300, heightPts: 200 }]);
  });

  it('se rinde ante imágenes en línea', () => {
    expect(findImagePlacements('q BI /W 1 /H 1 ID x EI Q')).toBeNull();
  });
});
