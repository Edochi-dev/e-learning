import { CertificateDate } from './certificate-date.vo';
import { DateStyle } from './date-style.vo';

/** The date as it is drawn on a certificate: text, position and style. */
export interface DateStamp {
  text: string;
  position: { x: number; y: number };
  fontSize: number;
  color: string;
  fontFamily: string;
  align: 'left' | 'center';
}

export function createDateStamp(
  style: DateStyle,
  date: CertificateDate,
): DateStamp {
  return {
    text: date.toDisplay(),
    position: { x: style.positionX, y: style.positionY },
    fontSize: style.fontSize,
    color: style.color,
    fontFamily: style.fontFamily,
    // Templates saved before alignment existed have no `align` key.
    align: style.align ?? 'left',
  };
}
