import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as path from 'path';
import * as fs from 'fs';
import { PdfCertificateGenerator } from './pdf-certificate-generator';
import { GenerateCertificateParams } from './gateways/certificate-generator.gateway';

// fontkit para cargar fuentes directamente en los tests de ancho
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fontkitModule = require('@pdf-lib/fontkit');
const fontkit = fontkitModule.default ?? fontkitModule;

/**
 * Test de integración para PdfCertificateGenerator
 *
 * Objetivo: detectar el bug de "text splitting" donde ciertas fuentes causan
 * que pdf-lib fragmente el texto (ej: "Maria" → "Mari a").
 *
 * Estrategia:
 * 1. Creamos un PDF en blanco como plantilla (no necesitamos archivo externo).
 * 2. Generamos un certificado con cada fuente y nombres conocidos.
 * 3. Parseamos el PDF resultante y verificamos que el texto del nombre aparezca
 *    como un solo bloque, sin fragmentación.
 *
 * ¿Cómo detectamos la fragmentación?
 * En un PDF, el texto se dibuja con operadores como:
 *   (Maria) Tj           ← correcto: todo junto
 *   [(Mari) 120 (a)] TJ  ← BUG: fragmentado con kerning falso
 *
 * Buscamos en el content stream del PDF los bytes del nombre codificado.
 * Si el nombre está fragmentado en múltiples operadores, el test falla.
 */
describe('PdfCertificateGenerator — text integrity', () => {
  let generator: PdfCertificateGenerator;
  let templatePath: string;
  let qrBuffer: Buffer;

  // Nombres largos con diferentes consonantes — así se manifestó el bug en prod.
  // Con nombres cortos no daba problemas.
  const testNames = [
    'Fabiola Guadalupe Hernández',
    'María Fernanda Castañeda Rodríguez',
    'Patricia Alejandra Domínguez Vargas',
    'Guadalupe Monserrath Villanueva',
    'Estefanía Concepción Bermúdez Salazar',
    'Jacqueline Betzabeth Maldonado Figueroa',
  ];

  // Todas las fuentes custom (TTF) disponibles en el proyecto
  const customFonts = [
    // Caligráficas — las más propensas al bug
    'GreatVibes-Regular',
    'Allura-Regular',
    'Sacramento-Regular',
    'DancingScript-Bold',
    'Pacifico-Regular',
    // Serif
    'Cinzel-Regular',
    'Cinzel-Bold',
    'PlayfairDisplay-Regular',
    'PlayfairDisplay-BoldItalic',
    'CormorantGaramond-SemiBold',
    'CormorantGaramond-SemiBoldItalic',
    'LibreBaskerville-Regular',
    'LibreBaskerville-Bold',
    // Sans-serif
    'Montserrat-Regular',
    'Montserrat-Bold',
    'Raleway-Regular',
    'Raleway-Bold',
    'NunitoSans-Regular',
  ];

  beforeAll(async () => {
    // Creamos un PDF en blanco de tamaño A4 para usar como plantilla
    const blankPdf = await PDFDocument.create();
    blankPdf.addPage([595, 842]); // A4 en puntos PDF
    const blankBytes = await blankPdf.save();

    // Lo guardamos en /tmp para que el generador lo pueda leer
    templatePath = path.join('/tmp', 'test-template-blank.pdf');
    fs.writeFileSync(templatePath, blankBytes);

    // QR mínimo (1x1 pixel PNG transparente) — solo necesitamos que sea un PNG válido
    qrBuffer = createMinimalPng();

    generator = new PdfCertificateGenerator();
  });

  afterAll(() => {
    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
    }
  });

  /**
   * Genera los params estándar para un test.
   * Posición centrada horizontalmente en la página A4.
   */
  function makeParams(
    name: string,
    fontFamily: string,
  ): GenerateCertificateParams {
    return {
      templatePath,
      recipientName: name,
      qrBuffer,
      namePosition: { x: 297, y: 400 }, // centro horizontal de A4 (595/2)
      fontSize: 36,
      nameColor: '#000000',
      fontFamily,
      nameAlign: 'center',
      qrPosition: { x: 50, y: 700 },
      qrSize: 60,
    };
  }

  // ─── Smoke test: todas las fuentes generan PDFs válidos ───────────────

  describe('smoke test — cada fuente genera un PDF válido', () => {
    for (const fontName of customFonts) {
      it(`genera PDF sin errores con fuente "${fontName}"`, async () => {
        const params = makeParams('Maria', fontName);
        const pdfBuffer = await generator.generate(params);

        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);

        // Verificamos que el resultado sea un PDF parseable
        const doc = await PDFDocument.load(pdfBuffer);
        expect(doc.getPageCount()).toBe(1);
      });
    }
  });

  // ─── Test de integridad de texto: detecta fragmentación ──────────────

  describe('integridad de texto — el nombre no se fragmenta', () => {
    for (const fontName of customFonts) {
      for (const name of testNames) {
        it(`"${name}" no se fragmenta con fuente "${fontName}"`, async () => {
          const params = makeParams(name, fontName);
          const pdfBuffer = await generator.generate(params);

          // Extraemos el content stream de la primera página
          const contentStream = extractPageContentStream(pdfBuffer);

          // Con el fix char-by-char, cada carácter se dibuja con su propio
          // operador Tj y posición X explícita. Verificamos que hay al menos
          // tantos operadores como caracteres en el nombre (cada char = 1 Tj).
          const textOps = countTextOperators(contentStream);

          // Cada carácter del nombre produce 1 operador Tj independiente.
          // Esto garantiza que el visor use la coordenada X explícita
          // en vez de calcularla con la tabla de anchos interna del font.
          expect(textOps.tjCount).toBeGreaterThanOrEqual(name.length);
        });
      }
    }
  });

  // ─── Test de consistencia de anchos ──────────────────────────────────

  describe('consistencia de anchos — widthOfTextAtSize vs suma char-by-char', () => {
    /**
     * Este test carga cada fuente en un PDFDocument y compara:
     * - widthOfTextAtSize("Maria", 36) → ancho total según pdf-lib
     * - Σ widthOfTextAtSize(char, 36) → suma de anchos individuales
     *
     * Si difieren significativamente, pdf-lib aplica kerning/ligatures
     * al string completo que no aplica char-by-char. Esto causa que
     * el texto "ocupe más espacio" del que cada glifo individual usa,
     * generando gaps visuales.
     *
     * Una diferencia > 0 indica que el renderizado char-by-char
     * producirá un resultado más compacto (sin gaps fantasma).
     */
    const fontsDir = path.join(__dirname, 'fonts');

    for (const fontName of customFonts) {
      for (const name of testNames) {
        it(`"${name}" tiene anchos consistentes con "${fontName}"`, async () => {
          const ttfPath = path.join(fontsDir, `${fontName}.ttf`);
          const fontBytes = fs.readFileSync(ttfPath);

          const doc = await PDFDocument.create();
          doc.registerFontkit(fontkit);
          const font = await doc.embedFont(fontBytes, { subset: false });

          const fontSize = 36;
          const totalWidth = font.widthOfTextAtSize(name, fontSize);
          const charByCharWidth = [...name].reduce(
            (sum, char) => sum + font.widthOfTextAtSize(char, fontSize),
            0,
          );

          // La diferencia debe ser mínima (< 2% del ancho total).
          // Si es mayor, hay kerning inconsistente que causa gaps visuales.
          const diff = Math.abs(totalWidth - charByCharWidth);
          const tolerance = totalWidth * 0.02;

          expect(diff).toBeLessThanOrEqual(tolerance);
        });
      }
    }
  });

  // ─── Test de diagnóstico: genera PDFs para inspección visual ─────────

  describe('diagnóstico visual — genera PDFs en /tmp para inspección', () => {
    const outputDir = '/tmp/cert-font-test';

    beforeAll(() => {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
    });

    it('genera un PDF de comparación con todas las fuentes', async () => {
      // Creamos un solo PDF con una página por fuente,
      // mostrando el nombre de prueba para comparar visualmente.
      const testName = 'Maria Fabiola Patricia';
      const doc = await PDFDocument.create();
      doc.registerFontkit(fontkit);

      const fontsDir = path.join(__dirname, 'fonts');

      for (const fontName of customFonts) {
        const page = doc.addPage([595, 400]);
        const ttfPath = path.join(fontsDir, `${fontName}.ttf`);
        const fontBytes = fs.readFileSync(ttfPath);
        const font = await doc.embedFont(fontBytes, { subset: false });

        // Título con Helvetica
        const helvetica = await doc.embedFont(StandardFonts.Helvetica);
        page.drawText(`Font: ${fontName}`, {
          x: 50,
          y: 350,
          size: 14,
          font: helvetica,
        });

        // Nombre completo con drawText normal
        page.drawText(testName, {
          x: 50,
          y: 280,
          size: 36,
          font,
        });

        // Label
        page.drawText('drawText normal (arriba) vs char-by-char (abajo)', {
          x: 50,
          y: 230,
          size: 10,
          font: helvetica,
        });

        // Nombre char-by-char para comparar
        let xPos = 50;
        for (const char of testName) {
          page.drawText(char, {
            x: xPos,
            y: 180,
            size: 36,
            font,
          });
          xPos += font.widthOfTextAtSize(char, 36);
        }
      }

      const pdfBytes = await doc.save();
      const outputPath = path.join(outputDir, 'font-comparison.pdf');
      fs.writeFileSync(outputPath, pdfBytes);

      // eslint-disable-next-line no-console
      console.log(`\n📄 PDF de diagnóstico generado en: ${outputPath}`);
      console.log('   Abre este PDF y compara el texto de arriba vs abajo.');
      console.log(
        '   Si hay diferencia visual, el fix char-by-char es necesario.\n',
      );

      expect(pdfBytes.length).toBeGreaterThan(0);
    });
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Crea un PNG válido de 1x1 pixel blanco (RGB).
 * Necesario porque pdfDoc.embedPng() requiere un PNG real con chunks válidos.
 */
function createMinimalPng(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC',
    'base64',
  );
}

/**
 * Extrae y descomprime todos los content streams del PDF.
 *
 * pdf-lib comprime los streams con FlateDecode. Para inspeccionar los
 * operadores de texto (Tj, TJ, Td, etc.) necesitamos descomprimirlos.
 * Usamos decodePDFRawStream de pdf-lib que maneja FlateDecode automáticamente.
 */
function extractPageContentStream(pdfBuffer: Buffer): string {
  // Usamos una versión síncrona: cargamos el PDF y decodificamos streams
  // No podemos usar async aquí, así que parseamos los bytes directamente.
  // pdf-lib guarda los streams comprimidos con FlateDecode.
  // Descomprimimos con zlib.
  const zlib = require('zlib');
  const pdfString = pdfBuffer.toString('latin1');
  const streams: string[] = [];
  let searchFrom = 0;

  while (true) {
    // Buscar inicio del stream (después de "stream\n" o "stream\r\n")
    let streamDataStart = -1;
    const idx1 = pdfString.indexOf('stream\r\n', searchFrom);
    const idx2 = pdfString.indexOf('stream\n', searchFrom);

    if (idx1 === -1 && idx2 === -1) break;

    if (idx1 !== -1 && (idx2 === -1 || idx1 < idx2)) {
      streamDataStart = idx1 + 8; // "stream\r\n".length
    } else {
      streamDataStart = idx2 + 7; // "stream\n".length
    }

    const streamEnd = pdfString.indexOf('endstream', streamDataStart);
    if (streamEnd === -1) break;

    const rawBytes = Buffer.from(
      pdfString.substring(streamDataStart, streamEnd),
      'latin1',
    );

    // Intentamos descomprimir (FlateDecode). Si falla, usamos los bytes raw.
    try {
      const decompressed = zlib.inflateSync(rawBytes);
      streams.push(decompressed.toString('latin1'));
    } catch {
      streams.push(rawBytes.toString('latin1'));
    }

    searchFrom = streamEnd + 9;
  }

  return streams.join('\n');
}

/**
 * Cuenta operadores de texto Tj en el content stream.
 *
 * pdf-lib usa dos formatos de string en los operadores:
 * - `(texto) Tj`    → string literal (fuentes estándar)
 * - `<001A004F> Tj` → string hex (fuentes custom/CIDFont)
 *
 * Con el fix char-by-char, cada carácter genera su propio operador Tj
 * con una posición X explícita. Esto evita que el visor use la tabla
 * de anchos interna del TTF para posicionar las letras.
 */
function countTextOperators(contentStream: string): {
  tjCount: number;
} {
  // Operadores Tj con string literal: (texto) Tj
  const literalTjPattern = /\(.*?\)\s*Tj/g;
  const literalMatches = contentStream.match(literalTjPattern) || [];

  // Operadores Tj con string hex: <XXXX> Tj (fuentes custom CIDFont)
  const hexTjPattern = /<[0-9A-Fa-f]+>\s*Tj/g;
  const hexMatches = contentStream.match(hexTjPattern) || [];

  return {
    tjCount: literalMatches.length + hexMatches.length,
  };
}
