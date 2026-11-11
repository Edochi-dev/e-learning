/**
 * Recodifica un JPEG baseline con tablas de Huffman óptimas (lo que hace
 * `jpegtran -optimize`). Los coeficientes DCT se copian tal cual: la imagen
 * decodificada es idéntica bit a bit, solo cambia cómo se empaquetan.
 *
 * Devuelve null cuando el JPEG no es baseline Huffman de 8 bits con todas sus
 * tablas definidas antes del primer escaneo: en ese caso no se toca.
 */
export function optimizeJpegHuffman(jpeg: Uint8Array): Uint8Array | null {
  try {
    return new HuffmanRecoder(jpeg).run();
  } catch {
    return null;
  }
}

interface FrameComponent {
  id: number;
  h: number;
  v: number;
}

interface Frame {
  width: number;
  height: number;
  hMax: number;
  vMax: number;
  components: FrameComponent[];
}

interface ScanComponent {
  component: FrameComponent;
  dcTable: number;
  acTable: number;
}

interface Scan {
  headerStart: number;
  headerEnd: number;
  dataEnd: number;
  components: ScanComponent[];
}

/** Tabla de Huffman canónica (F.2.2.3) para decodificar y codificar. */
class HuffmanTable {
  readonly maxCode = new Int32Array(18).fill(-1);
  readonly valPtr = new Int32Array(17);
  readonly minCode = new Int32Array(17);
  readonly codes = new Uint16Array(256);
  readonly sizes = new Uint8Array(256);

  constructor(
    readonly bits: Uint8Array,
    readonly values: Uint8Array,
  ) {
    let code = 0;
    let k = 0;
    for (let length = 1; length <= 16; length++) {
      this.valPtr[length] = k;
      this.minCode[length] = code;
      for (let i = 0; i < bits[length - 1]; i++) {
        this.codes[values[k]] = code;
        this.sizes[values[k]] = length;
        code++;
        k++;
      }
      this.maxCode[length] = bits[length - 1] ? code - 1 : -1;
      code <<= 1;
    }
    this.maxCode[17] = 0x7fffffff;
  }
}

class BitReader {
  private pos: number;
  private bitBuffer = 0;
  private bitCount = 0;

  constructor(
    private readonly data: Uint8Array,
    start: number,
    private readonly end: number,
  ) {
    this.pos = start;
  }

  readBit(): number {
    if (this.bitCount === 0) {
      if (this.pos >= this.end) throw new Error('Entropy data overrun');
      const byte = this.data[this.pos++];
      if (byte === 0xff) {
        const next = this.data[this.pos];
        if (next === 0x00) this.pos++;
        else throw new Error('Unexpected marker inside entropy data');
      }
      this.bitBuffer = byte;
      this.bitCount = 8;
    }
    this.bitCount--;
    return (this.bitBuffer >> this.bitCount) & 1;
  }

  readBits(count: number): number {
    let value = 0;
    for (let i = 0; i < count; i++) value = (value << 1) | this.readBit();
    return value;
  }

  decode(table: HuffmanTable): number {
    let code = this.readBit();
    let length = 1;
    while (code > table.maxCode[length]) {
      code = (code << 1) | this.readBit();
      length++;
      if (length > 16) throw new Error('Invalid Huffman code');
    }
    return table.values[table.valPtr[length] + code - table.minCode[length]];
  }

  /** Salta el relleno del byte actual y el marcador RSTn que debe seguir. */
  consumeRestart(expected: number): void {
    this.bitCount = 0;
    if (
      this.data[this.pos] !== 0xff ||
      this.data[this.pos + 1] !== 0xd0 + expected
    ) {
      throw new Error('Missing restart marker');
    }
    this.pos += 2;
  }

  get position(): number {
    return this.pos;
  }
}

class BitWriter {
  private chunks: Uint8Array[] = [];
  private buffer = new Uint8Array(1 << 16);
  private length = 0;
  private bitBuffer = 0;
  private bitCount = 0;

  private pushByte(byte: number): void {
    if (this.length === this.buffer.length) {
      this.chunks.push(this.buffer);
      this.buffer = new Uint8Array(this.buffer.length);
      this.length = 0;
    }
    this.buffer[this.length++] = byte;
  }

  writeBits(value: number, count: number): void {
    for (let i = count - 1; i >= 0; i--) {
      this.bitBuffer = (this.bitBuffer << 1) | ((value >> i) & 1);
      this.bitCount++;
      if (this.bitCount === 8) {
        this.pushByte(this.bitBuffer);
        if (this.bitBuffer === 0xff) this.pushByte(0x00);
        this.bitBuffer = 0;
        this.bitCount = 0;
      }
    }
  }

  /** Rellena con unos hasta el byte, como exige la norma antes de un marcador. */
  flush(): void {
    if (this.bitCount > 0) this.writeBits(0xff, 8 - this.bitCount);
  }

  writeMarker(marker: number): void {
    this.pushByte(0xff);
    this.pushByte(marker);
  }

  toBytes(): Uint8Array {
    const all = [...this.chunks, this.buffer.subarray(0, this.length)];
    const out = new Uint8Array(all.reduce((sum, c) => sum + c.length, 0));
    let offset = 0;
    for (const chunk of all) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}

/** Contador de frecuencias por símbolo (más el pseudo-símbolo 256 de K.2). */
type Frequencies = Float64Array;

class HuffmanRecoder {
  private frame: Frame | null = null;
  private restartInterval = 0;
  private readonly tables = new Map<number, HuffmanTable>();
  private readonly scans: Scan[] = [];
  private readonly dhtSegments: Array<[number, number]> = [];
  private eoiOffset = -1;

  constructor(private readonly data: Uint8Array) {}

  run(): Uint8Array | null {
    if (!this.parse()) return null;

    const frequencies = new Map<number, Frequencies>();
    for (const scan of this.scans) this.walkScan(scan, frequencies, null);

    const optimized = new Map<number, HuffmanTable>();
    for (const [key, freq] of frequencies) {
      optimized.set(key, buildOptimalTable(freq));
    }
    return this.write(optimized);
  }

  private parse(): boolean {
    const d = this.data;
    if (d[0] !== 0xff || d[1] !== 0xd8) return false;
    let pos = 2;
    while (pos < d.length) {
      if (d[pos] !== 0xff) return false;
      while (d[pos] === 0xff) pos++;
      const marker = d[pos++];
      if (marker === 0xd9) {
        this.eoiOffset = pos - 2;
        return this.frame !== null && this.scans.length > 0;
      }
      const length = (d[pos] << 8) | d[pos + 1];
      const segmentStart = pos - 2;
      const body = pos + 2;
      const segmentEnd = pos + length;

      if (marker === 0xc0 || marker === 0xc1) {
        if (d[body] !== 8) return false;
        this.frame = parseFrame(d, body);
      } else if (isUnsupportedMarker(marker)) {
        return false;
      } else if (marker === 0xc4) {
        if (this.scans.length > 0) return false;
        this.parseTables(body, segmentEnd);
        this.dhtSegments.push([segmentStart, segmentEnd]);
      } else if (marker === 0xdd) {
        this.restartInterval = (d[body] << 8) | d[body + 1];
      } else if (marker === 0xda) {
        if (!this.frame) return false;
        const scan = this.parseScanHeader(segmentStart, body, segmentEnd);
        if (!scan) return false;
        this.scans.push(scan);
        pos = scan.dataEnd;
        continue;
      }
      pos = segmentEnd;
    }
    return false;
  }

  private parseTables(start: number, end: number): void {
    const d = this.data;
    let pos = start;
    while (pos < end) {
      const classAndId = d[pos++];
      const bits = d.slice(pos, pos + 16);
      pos += 16;
      const count = bits.reduce((sum, b) => sum + b, 0);
      const values = d.slice(pos, pos + count);
      pos += count;
      this.tables.set(classAndId, new HuffmanTable(bits, values));
    }
  }

  private parseScanHeader(
    headerStart: number,
    body: number,
    headerEnd: number,
  ): Scan | null {
    const d = this.data;
    const frame = this.frame as Frame;
    const count = d[body];
    const components: ScanComponent[] = [];
    for (let i = 0; i < count; i++) {
      const id = d[body + 1 + i * 2];
      const tables = d[body + 2 + i * 2];
      const component = frame.components.find((c) => c.id === id);
      if (!component) return null;
      components.push({
        component,
        dcTable: tables >> 4,
        acTable: tables & 15,
      });
    }
    const spectral = body + 1 + count * 2;
    if (d[spectral] !== 0 || d[spectral + 1] !== 63 || d[spectral + 2] !== 0) {
      return null;
    }
    // Fin de los datos entrópicos: primer marcador que no sea relleno ni RSTn.
    let pos = headerEnd;
    while (pos < d.length - 1) {
      if (d[pos] === 0xff) {
        const next = d[pos + 1];
        if (next !== 0x00 && !(next >= 0xd0 && next <= 0xd7)) break;
        pos += 2;
      } else {
        pos++;
      }
    }
    return { headerStart, headerEnd, dataEnd: pos, components };
  }

  /**
   * Recorre los bloques de un escaneo. Sin `writer` solo cuenta frecuencias;
   * con `writer` reescribe cada símbolo con las tablas nuevas y copia los bits extra.
   */
  private walkScan(
    scan: Scan,
    frequencies: Map<number, Frequencies>,
    output: { writer: BitWriter; tables: Map<number, HuffmanTable> } | null,
  ): void {
    const frame = this.frame as Frame;
    const reader = new BitReader(this.data, scan.headerEnd, scan.dataEnd);
    const single = scan.components.length === 1;

    let mcusX: number;
    let mcusY: number;
    if (single) {
      const c = scan.components[0].component;
      mcusX = Math.ceil(Math.ceil((frame.width * c.h) / frame.hMax) / 8);
      mcusY = Math.ceil(Math.ceil((frame.height * c.v) / frame.vMax) / 8);
    } else {
      mcusX = Math.ceil(frame.width / (8 * frame.hMax));
      mcusY = Math.ceil(frame.height / (8 * frame.vMax));
    }

    const lookup = (tableClass: number, id: number) => {
      const key = (tableClass << 4) | id;
      const table = this.tables.get(key);
      if (!table) throw new Error('Missing Huffman table');
      let freq = frequencies.get(key);
      if (!freq) {
        freq = new Float64Array(257);
        frequencies.set(key, freq);
      }
      return { key, table, freq };
    };
    const units = scan.components.map((sc) => ({
      dc: lookup(0, sc.dcTable),
      ac: lookup(1, sc.acTable),
      blocks: single ? 1 : sc.component.h * sc.component.v,
    }));

    const emit = (
      entry: { key: number; freq: Frequencies },
      symbol: number,
    ): void => {
      if (output) {
        const table = output.tables.get(entry.key) as HuffmanTable;
        output.writer.writeBits(table.codes[symbol], table.sizes[symbol]);
      } else {
        entry.freq[symbol]++;
      }
    };
    const copyBits = (count: number): void => {
      const bits = reader.readBits(count);
      if (output && count) output.writer.writeBits(bits, count);
    };

    const totalMcus = mcusX * mcusY;
    let restartsLeft = this.restartInterval;
    let restartIndex = 0;
    for (let mcu = 0; mcu < totalMcus; mcu++) {
      if (this.restartInterval && restartsLeft === 0) {
        reader.consumeRestart(restartIndex);
        if (output) {
          output.writer.flush();
          output.writer.writeMarker(0xd0 + restartIndex);
        }
        restartIndex = (restartIndex + 1) & 7;
        restartsLeft = this.restartInterval;
      }
      for (const unit of units) {
        for (let b = 0; b < unit.blocks; b++) {
          const dcSize = reader.decode(unit.dc.table);
          emit(unit.dc, dcSize);
          copyBits(dcSize);
          for (let k = 1; k < 64; ) {
            const rs = reader.decode(unit.ac.table);
            emit(unit.ac, rs);
            const run = rs >> 4;
            const size = rs & 15;
            if (size === 0) {
              if (run !== 15) break;
              k += 16;
              continue;
            }
            k += run;
            copyBits(size);
            k++;
          }
        }
      }
      restartsLeft--;
    }
    if (output) output.writer.flush();
  }

  private write(tables: Map<number, HuffmanTable>): Uint8Array {
    const d = this.data;
    const parts: Uint8Array[] = [];
    const firstScan = this.scans[0];
    // Segmentos anteriores al primer escaneo, sin los DHT originales.
    let pos = 0;
    for (const [start, end] of this.dhtSegments) {
      parts.push(d.subarray(pos, start));
      pos = end;
    }
    parts.push(d.subarray(pos, firstScan.headerStart));

    parts.push(encodeDht(tables));

    for (let i = 0; i < this.scans.length; i++) {
      const scan = this.scans[i];
      parts.push(d.subarray(scan.headerStart, scan.headerEnd));
      const writer = new BitWriter();
      this.walkScan(scan, new Map(), { writer, tables });
      parts.push(writer.toBytes());
      const nextStart =
        i + 1 < this.scans.length
          ? this.scans[i + 1].headerStart
          : this.eoiOffset;
      parts.push(d.subarray(scan.dataEnd, nextStart));
    }
    parts.push(d.subarray(this.eoiOffset));

    const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }
}

/** Progresivo, sin pérdida, jerárquico, aritmético (SOF/DAC) o DNL. */
function isUnsupportedMarker(marker: number): boolean {
  const isOtherSof =
    marker >= 0xc2 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8;
  return isOtherSof || marker === 0xdc;
}

function parseFrame(d: Uint8Array, body: number): Frame {
  const height = (d[body + 1] << 8) | d[body + 2];
  const width = (d[body + 3] << 8) | d[body + 4];
  const count = d[body + 5];
  const components: FrameComponent[] = [];
  for (let i = 0; i < count; i++) {
    const at = body + 6 + i * 3;
    components.push({ id: d[at], h: d[at + 1] >> 4, v: d[at + 1] & 15 });
  }
  return {
    width,
    height,
    components,
    hMax: Math.max(...components.map((c) => c.h)),
    vMax: Math.max(...components.map((c) => c.v)),
  };
}

function encodeDht(tables: Map<number, HuffmanTable>): Uint8Array {
  const body: number[] = [];
  for (const [key, table] of [...tables].sort(([a], [b]) => a - b)) {
    body.push(key, ...table.bits, ...table.values);
  }
  const length = body.length + 2;
  return Uint8Array.from([0xff, 0xc4, length >> 8, length & 0xff, ...body]);
}

/**
 * Tabla óptima según el anexo K.2 de la norma (port de jpeg_gen_optimal_table
 * de libjpeg): longitudes ≤ 16 bits y ningún código formado solo por unos.
 */
function buildOptimalTable(input: Frequencies): HuffmanTable {
  const freq = Float64Array.from(input);
  freq[256] = 1;
  const codeSize = new Int32Array(257);
  const others = new Int32Array(257).fill(-1);

  for (;;) {
    let c1 = -1;
    let v = Infinity;
    for (let i = 0; i <= 256; i++) {
      if (freq[i] && freq[i] <= v) {
        v = freq[i];
        c1 = i;
      }
    }
    let c2 = -1;
    v = Infinity;
    for (let i = 0; i <= 256; i++) {
      if (freq[i] && freq[i] <= v && i !== c1) {
        v = freq[i];
        c2 = i;
      }
    }
    if (c2 < 0) break;

    freq[c1] += freq[c2];
    freq[c2] = 0;
    codeSize[c1]++;
    while (others[c1] >= 0) {
      c1 = others[c1];
      codeSize[c1]++;
    }
    others[c1] = c2;
    codeSize[c2]++;
    while (others[c2] >= 0) {
      c2 = others[c2];
      codeSize[c2]++;
    }
  }

  const bits = new Int32Array(33);
  for (let i = 0; i <= 256; i++) {
    if (codeSize[i] > 32) throw new Error('Huffman code too long');
    if (codeSize[i]) bits[codeSize[i]]++;
  }
  for (let i = 32; i > 16; i--) {
    while (bits[i] > 0) {
      let j = i - 2;
      while (bits[j] === 0) j--;
      bits[i] -= 2;
      bits[i - 1]++;
      bits[j + 1] += 2;
      bits[j]--;
    }
  }
  let longest = 16;
  while (bits[longest] === 0) longest--;
  bits[longest]--; // quita el pseudo-símbolo 256

  const values: number[] = [];
  for (let size = 1; size <= 32; size++) {
    for (let symbol = 0; symbol <= 255; symbol++) {
      if (codeSize[symbol] === size) values.push(symbol);
    }
  }
  return new HuffmanTable(
    Uint8Array.from(bits.subarray(1, 17)),
    Uint8Array.from(values),
  );
}
