import { CertificateDate } from './certificate-date.vo';
import { createDateStamp } from './date-stamp.vo';
import { DateStyle } from './date-style.vo';

describe('createDateStamp', () => {
  const style: DateStyle = {
    positionX: 169,
    positionY: 501,
    fontSize: 10,
    color: '#333333',
    fontFamily: 'Montserrat-Regular',
    align: 'center',
  };

  it('combina la fecha a imprimir con el estilo de la plantilla', () => {
    expect(
      createDateStamp(style, CertificateDate.fromIso('2026-04-20')),
    ).toEqual({
      text: '20/04/2026',
      position: { x: 169, y: 501 },
      fontSize: 10,
      color: '#333333',
      fontFamily: 'Montserrat-Regular',
      align: 'center',
    });
  });

  it('alinea a la izquierda si la plantilla es anterior a la alineación', () => {
    const legacy = { ...style, align: undefined } as unknown as DateStyle;

    expect(
      createDateStamp(legacy, CertificateDate.fromIso('2026-04-20')).align,
    ).toBe('left');
  });
});
