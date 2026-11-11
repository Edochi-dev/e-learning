/** Lo que hace falta saber de un JPEG para recodificarlo con el mismo carácter. */
export interface JpegInfo {
  /** Todas las componentes con el mismo muestreo (sin submuestreo de croma). */
  fullChroma: boolean;
  /** Calidad estimada (escala de IJG) a partir de la tabla de cuantización de luminancia. */
  estimatedQuality: number;
  hasIccProfile: boolean;
}

// Tabla K.1 de la norma (luminancia, calidad 50), en orden zigzag como en DQT.
const BASE_LUMINANCE_ZIGZAG = [
  16, 11, 12, 14, 12, 10, 16, 14, 13, 14, 18, 17, 16, 19, 24, 40, 26, 24, 22,
  22, 24, 49, 35, 37, 29, 40, 58, 51, 61, 60, 57, 51, 56, 55, 64, 72, 92, 78,
  64, 68, 87, 69, 55, 56, 80, 109, 81, 87, 95, 98, 103, 104, 103, 62, 77, 113,
  121, 112, 100, 120, 92, 101, 103, 99,
];

export function readJpegInfo(jpeg: Uint8Array): JpegInfo | null {
  let fullChroma: boolean | null = null;
  let luminance: number[] | null = null;
  let hasIccProfile = false;

  let pos = 2;
  while (pos + 4 <= jpeg.length) {
    if (jpeg[pos] !== 0xff) return null;
    const marker = jpeg[pos + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = (jpeg[pos + 2] << 8) | jpeg[pos + 3];
    const body = pos + 4;

    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const count = jpeg[body + 5];
      const samplings = new Set<number>();
      for (let i = 0; i < count; i++) samplings.add(jpeg[body + 7 + i * 3]);
      fullChroma = samplings.size === 1;
    } else if (marker === 0xdb) {
      let at = body;
      while (at < pos + 2 + length) {
        const precision = jpeg[at] >> 4;
        const id = jpeg[at] & 15;
        const size = precision ? 128 : 64;
        const values: number[] = [];
        for (let k = 0; k < 64; k++) {
          values.push(
            precision
              ? (jpeg[at + 1 + k * 2] << 8) | jpeg[at + 2 + k * 2]
              : jpeg[at + 1 + k],
          );
        }
        if (id === 0) luminance = values;
        at += 1 + size;
      }
    } else if (marker === 0xe2) {
      const tag = String.fromCharCode(...jpeg.subarray(body, body + 11));
      if (tag === 'ICC_PROFILE') hasIccProfile = true;
    }
    pos += 2 + length;
  }

  if (fullChroma === null || luminance === null) return null;
  const table = luminance;
  const scale =
    BASE_LUMINANCE_ZIGZAG.reduce(
      (sum, base, k) => sum + (table[k] * 100) / base,
      0,
    ) / 64;
  const quality = scale <= 100 ? (200 - scale) / 2 : 5000 / scale;
  return {
    fullChroma,
    estimatedQuality: Math.min(100, Math.max(50, Math.round(quality))),
    hasIccProfile,
  };
}
