import { Injectable, Logger } from '@nestjs/common';
import {
  decodePDFRawStream,
  PDFArray,
  PDFContext,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFPage,
  PDFRawStream,
  PDFRef,
  PDFStream,
} from 'pdf-lib';
import sharp from 'sharp';
import { TemplatePdfOptimizerGateway } from '../gateways/template-pdf-optimizer.gateway';
import { optimizeJpegHuffman } from './jpeg-huffman-optimizer';
import { readJpegInfo } from './jpeg-info';
import { findImagePlacements, Placement } from './image-placements';

/** Resolución de impresión de los certificados: más píxeles no se ven, solo pesan. */
export const TARGET_DPI = 300;

// Datos que ningún visor dibuja: XMP, datos privados de Photoshop/Illustrator y miniaturas.
// Los perfiles ICC (OutputIntents, ICCBased, DefaultRGB) se conservan: definen el color.
const INVISIBLE_KEYS = ['Metadata', 'PieceInfo', 'Thumb'].map((k) =>
  PDFName.of(k),
);

const name = (key: string) => PDFName.of(key);

/**
 * Optimiza una plantilla con pdf-lib + sharp:
 *  1. Quita metadatos que no se dibujan.
 *  2. Baja a 300 ppp las fotos JPEG que la superan (único paso con pérdida,
 *     y solo cuando sobran píxeles que la impresión no puede mostrar).
 *  3. Recodifica el resto de JPEG con Huffman óptimo, comprobando que los
 *     píxeles decodificados sean idénticos.
 *  4. Descarta objetos que ya nadie referencia.
 */
@Injectable()
export class PdfLibTemplateOptimizer implements TemplatePdfOptimizerGateway {
  private readonly logger = new Logger(PdfLibTemplateOptimizer.name);

  async optimize(pdf: Buffer): Promise<Buffer> {
    try {
      const doc = await PDFDocument.load(pdf, { updateMetadata: false });
      this.stripInvisibleData(doc);
      const downscaled = await this.downscaleOversizedImages(doc);
      await this.recodeJpegs(doc, downscaled);
      removeUnreachableObjects(doc.context);
      const optimized = Buffer.from(
        await doc.save({
          useObjectStreams: true,
          updateFieldAppearances: false,
        }),
      );
      return optimized.length < pdf.length ? optimized : pdf;
    } catch (error) {
      this.logger.warn(
        `No se pudo optimizar la plantilla, se guarda tal cual: ${(error as Error).message}`,
      );
      return pdf;
    }
  }

  private stripInvisibleData(doc: PDFDocument): void {
    const holders: PDFDict[] = [
      doc.catalog,
      ...doc.getPages().map((p) => p.node),
    ];
    for (const [, object] of doc.context.enumerateIndirectObjects()) {
      if (object instanceof PDFRawStream && isImage(object.dict)) {
        holders.push(object.dict);
      }
    }
    for (const holder of holders) {
      for (const key of INVISIBLE_KEYS) holder.delete(key);
    }
  }

  /**
   * Junta, por imagen, todos los tamaños a los que la dibujan las páginas y la
   * re-muestrea según el mayor. Devuelve las referencias ya reescritas.
   */
  private async downscaleOversizedImages(
    doc: PDFDocument,
  ): Promise<Set<string>> {
    const done = new Set<string>();
    // Un Form sin /Resources propios dibuja con los de la página: no lo seguimos.
    if (hasFormsInheritingResources(doc.context)) return done;

    const drawnSizes = new Map<string, { ref: PDFRef; sizes: Placement[] }>();
    for (const page of doc.getPages()) {
      const xObjects = page.node
        .Resources()
        ?.lookupMaybe(name('XObject'), PDFDict);
      if (!xObjects) continue;
      const placements = findImagePlacements(readPageContent(page));
      // Con imágenes en línea no vemos todo lo que se dibuja: no se toca nada.
      if (!placements) return done;

      for (const [key, value] of xObjects.entries()) {
        if (!(value instanceof PDFRef)) continue;
        const entry = drawnSizes.get(value.toString()) ?? {
          ref: value,
          sizes: [],
        };
        entry.sizes.push(...(placements.get(key.decodeText()) ?? []));
        drawnSizes.set(value.toString(), entry);
      }
    }

    const referenceCounts = countReferences(doc.context);
    for (const { ref, sizes } of drawnSizes.values()) {
      // Referenciada desde otro sitio (otra página, un Form…), podría verse más grande.
      if (referenceCounts.get(ref.toString()) !== 1 || !sizes.length) continue;
      const stream = doc.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) continue;
      try {
        const replacement = await downscaleJpegImage(stream, largest(sizes));
        if (replacement) {
          doc.context.assign(ref, replacement);
          done.add(ref.toString());
        }
      } catch (error) {
        this.logger.warn(
          `No se pudo re-muestrear ${ref.toString()}: ${(error as Error).message}`,
        );
      }
    }
    return done;
  }

  private async recodeJpegs(
    doc: PDFDocument,
    skip: Set<string>,
  ): Promise<void> {
    for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
      if (skip.has(ref.toString())) continue;
      if (!(object instanceof PDFRawStream) || !isDctImage(object.dict))
        continue;

      const original = object.contents;
      const recoded = optimizeJpegHuffman(original);
      if (!recoded || recoded.length >= original.length) continue;
      // Red de seguridad: solo se reemplaza si decodifica a los mismos píxeles.
      const identical = await decodeToSamePixels(original, recoded).catch(
        () => false,
      );
      if (!identical) {
        this.logger.warn(
          `Huffman de ${ref.toString()} no reproduce los píxeles; se conserva`,
        );
        continue;
      }
      doc.context.assign(ref, withContents(doc.context, object.dict, recoded));
    }
  }
}

function hasFormsInheritingResources(context: PDFContext): boolean {
  for (const [, object] of context.enumerateIndirectObjects()) {
    if (
      object instanceof PDFRawStream &&
      object.dict.get(name('Subtype')) === name('Form') &&
      !object.dict.has(name('Resources'))
    ) {
      return true;
    }
  }
  return false;
}

function isImage(dict: PDFDict): boolean {
  return dict.get(name('Subtype')) === name('Image');
}

function isDctImage(dict: PDFDict): boolean {
  return isImage(dict) && dict.get(name('Filter')) === name('DCTDecode');
}

function largest(placements: Placement[]): Placement {
  return placements.reduce((a, b) =>
    a.widthPts * a.heightPts >= b.widthPts * b.heightPts ? a : b,
  );
}

function readPageContent(page: PDFPage): string {
  const contents = page.node.Contents();
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((ref) => page.doc.context.lookup(ref))
      : [contents];
  return streams
    .filter((s): s is PDFRawStream => s instanceof PDFRawStream)
    .map((s) => Buffer.from(decodePDFRawStream(s).decode()).toString('latin1'))
    .join('\n');
}

/**
 * Re-muestrea a 300 ppp exactos una foto JPEG que el contenido dibuja con más
 * resolución. Solo casos sin sorpresas: RGB o gris de 8 bits, sin máscaras,
 * sin /Decode y sin perfil ICC incrustado. Lo demás se deja tal cual.
 */
async function downscaleJpegImage(
  stream: PDFRawStream,
  drawn: Placement,
): Promise<PDFStream | null> {
  const dict = stream.dict;
  const colorSpace = dict.get(name('ColorSpace'));
  const plain =
    isDctImage(dict) &&
    dict.get(name('BitsPerComponent'))?.toString() === '8' &&
    (colorSpace === name('DeviceRGB') || colorSpace === name('DeviceGray')) &&
    !['SMask', 'Mask', 'Decode', 'ImageMask'].some((k) => dict.has(name(k)));
  if (!plain) return null;

  const info = readJpegInfo(stream.contents);
  if (!info || info.hasIccProfile) return null;

  const width = (dict.get(name('Width')) as PDFNumber).asNumber();
  const height = (dict.get(name('Height')) as PDFNumber).asNumber();
  const targetWidth = Math.round((drawn.widthPts / 72) * TARGET_DPI);
  const targetHeight = Math.round((drawn.heightPts / 72) * TARGET_DPI);
  // ±1 px de redondeo: un A4 de 2480 px ya está a 300 ppp.
  if (width <= targetWidth + 1 || height <= targetHeight + 1) return null;

  const gray = colorSpace === name('DeviceGray');
  // sharp guarda en RGB por defecto: una imagen en gris debe seguir en gris.
  const jpeg = await sharp(Buffer.from(stream.contents))
    .resize(targetWidth, targetHeight, { fit: 'fill', kernel: 'lanczos3' })
    .toColourspace(gray ? 'b-w' : 'srgb')
    .jpeg({
      quality: info.estimatedQuality,
      chromaSubsampling: info.fullChroma ? '4:4:4' : '4:2:0',
    })
    .toBuffer();
  // El /ColorSpace del PDF sigue valiendo solo si el JPEG nuevo tiene los mismos canales.
  if ((await sharp(jpeg).metadata()).channels !== (gray ? 1 : 3)) return null;

  const resized = dict.clone();
  resized.set(name('Width'), PDFNumber.of(targetWidth));
  resized.set(name('Height'), PDFNumber.of(targetHeight));
  // Los DecodeParms de Photoshop describen el JPEG original, no el nuevo.
  resized.delete(name('DecodeParms'));
  return withContents(stream.dict.context, resized, jpeg);
}

function withContents(
  context: PDFContext,
  dict: PDFDict,
  contents: Uint8Array,
): PDFRawStream {
  const copy = dict.clone(context);
  copy.set(name('Length'), PDFNumber.of(contents.length));
  return PDFRawStream.of(copy, contents);
}

async function decodeToSamePixels(
  a: Uint8Array,
  b: Uint8Array,
): Promise<boolean> {
  const [pa, pb] = await Promise.all(
    [a, b].map((bytes) => sharp(Buffer.from(bytes)).raw().toBuffer()),
  );
  return pa.equals(pb);
}

function children(object: PDFObject | undefined): PDFObject[] {
  if (object instanceof PDFDict) return object.values();
  if (object instanceof PDFArray) return object.asArray();
  if (object instanceof PDFStream) return object.dict.values();
  return [];
}

function countReferences(context: PDFContext): Map<string, number> {
  const counts = new Map<string, number>();
  const visit = (object: PDFObject) => {
    if (object instanceof PDFRef) {
      counts.set(object.toString(), (counts.get(object.toString()) ?? 0) + 1);
      return;
    }
    children(object).forEach(visit);
  };
  for (const [, object] of context.enumerateIndirectObjects()) visit(object);
  return counts;
}

/** pdf-lib guarda todo objeto cargado, aunque ya nadie lo use (XMP borrado, datos de linearización…). */
function removeUnreachableObjects(context: PDFContext): void {
  const reachable = new Set<string>();
  const pending: PDFObject[] = [
    context.trailerInfo.Root,
    context.trailerInfo.Info,
  ].filter((o): o is PDFObject => o !== undefined);

  while (pending.length) {
    const object = pending.pop() as PDFObject;
    if (object instanceof PDFRef) {
      if (reachable.has(object.toString())) continue;
      reachable.add(object.toString());
      const target = context.lookup(object);
      if (target) pending.push(target);
      continue;
    }
    pending.push(...children(object));
  }
  for (const [ref] of context.enumerateIndirectObjects()) {
    if (!reachable.has(ref.toString())) context.delete(ref);
  }
}
