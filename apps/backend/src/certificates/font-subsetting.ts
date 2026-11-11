import { create } from '@pdf-lib/fontkit';

/** Tabla de TrueType que fontkit expone en runtime pero sus tipos no declaran. */
interface TrueTypeTables {
  loca?: { offsets: number[] };
}

/**
 * Indica si fontkit puede incrustar esta fuente como subconjunto sin corromperla.
 *
 * fontkit escribe el subconjunto con un `loca` corto (offsets guardados a la mitad)
 * cuando ocupa menos de 64 KB, y así pierde el bit bajo de cualquier offset impar:
 * las fuentes con glifos no alineados a 2 bytes (Allura) salen con glifos rotos.
 * Esas, y cualquier fuente sin `loca`, deben incrustarse completas.
 */
export function canSubsetSafely(fontBytes: Uint8Array): boolean {
  const { loca } = create(fontBytes) as unknown as TrueTypeTables;
  return hasWordAlignedGlyphs(loca?.offsets ?? []);
}

/** Offsets de `loca` ya en bytes: todos pares ⇒ el `loca` corto los conserva. */
export function hasWordAlignedGlyphs(offsets: readonly number[]): boolean {
  return offsets.length > 0 && offsets.every((offset) => offset % 2 === 0);
}
