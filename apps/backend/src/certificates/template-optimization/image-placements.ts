/** Tamaño, en puntos PDF, con el que el contenido de una página dibuja un XObject. */
export interface Placement {
  widthPts: number;
  heightPts: number;
}

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const WHITESPACE = /[\0\t\n\f\r ]/;
const DELIMITERS = /[()<>[\]{}/%\0\t\n\f\r ]/;

/** CTM nueva = M × CTM actual (convención de vector fila del PDF). */
function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

/**
 * Sigue q/Q/cm/Do en el contenido de una página y devuelve, por nombre de
 * XObject, los tamaños a los que se dibuja. Devuelve null si hay imágenes en
 * línea (BI…EI): su contenido binario no se puede tokenizar con seguridad.
 */
export function findImagePlacements(
  content: string,
): Map<string, Placement[]> | null {
  const placements = new Map<string, Placement[]>();
  const stack: Matrix[] = [];
  let ctm: Matrix = IDENTITY;
  let operands: Array<number | string> = [];
  let i = 0;

  while (i < content.length) {
    const ch = content[i];
    if (WHITESPACE.test(ch)) {
      i++;
    } else if (ch === '%') {
      while (i < content.length && content[i] !== '\n' && content[i] !== '\r')
        i++;
    } else if (ch === '(') {
      let depth = 1;
      i++;
      while (i < content.length && depth > 0) {
        if (content[i] === '\\') i++;
        else if (content[i] === '(') depth++;
        else if (content[i] === ')') depth--;
        i++;
      }
      operands.push('(string)');
    } else if (ch === '<' && content[i + 1] !== '<') {
      i = content.indexOf('>', i) + 1 || content.length;
      operands.push('<hex>');
    } else if (ch === '<' || ch === '>') {
      i += 2;
      operands.push(ch === '<' ? '<<' : '>>');
    } else if (ch === '[' || ch === ']' || ch === '{' || ch === '}') {
      i++;
      operands.push(ch);
    } else if (ch === '/') {
      let j = i + 1;
      while (j < content.length && !DELIMITERS.test(content[j])) j++;
      operands.push(content.slice(i, j));
      i = j;
    } else {
      let j = i;
      while (j < content.length && !DELIMITERS.test(content[j])) j++;
      const token = content.slice(i, j);
      i = j;
      const number = Number(token);
      if (token !== '' && !Number.isNaN(number)) {
        operands.push(number);
        continue;
      }
      if (token === 'BI') return null;
      if (token === 'q') stack.push(ctm);
      else if (token === 'Q') ctm = stack.pop() ?? IDENTITY;
      else if (token === 'cm' && operands.length >= 6) {
        const m = operands.slice(-6);
        if (m.every((v) => typeof v === 'number')) {
          ctm = multiply(m as Matrix, ctm);
        }
      } else if (token === 'Do') {
        const name = operands[operands.length - 1];
        if (typeof name === 'string' && name.startsWith('/')) {
          const list = placements.get(name.slice(1)) ?? [];
          list.push({
            widthPts: Math.hypot(ctm[0], ctm[1]),
            heightPts: Math.hypot(ctm[2], ctm[3]),
          });
          placements.set(name.slice(1), list);
        }
      } else if (token === '') {
        i++;
      }
      if (token !== 'true' && token !== 'false' && token !== 'null') {
        operands = [];
      }
    }
  }
  return placements;
}
