/** HTML that is already safe to insert as-is. Only the `html` tag creates it. */
export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type Interpolation = string | number | SafeHtml | SafeHtml[];

/**
 * Tagged template for email markup: every interpolated value is escaped unless
 * it is itself SafeHtml. User-provided text (names, feedback) must go through
 * here, never through plain string concatenation.
 */
export function html(
  strings: TemplateStringsArray,
  ...values: Interpolation[]
): SafeHtml {
  let out = strings[0];
  values.forEach((value, i) => {
    out += render(value) + strings[i + 1];
  });
  return new SafeHtml(out);
}

function render(value: Interpolation): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map((v) => v.value).join('');
  return escapeHtml(String(value));
}
