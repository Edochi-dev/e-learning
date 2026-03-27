/**
 * DateStyle — Value Object que agrupa la configuración visual de la fecha.
 *
 * Similar a NameStyle pero con un campo adicional: `show`.
 * Si show=false, el generador de PDF no renderiza la fecha.
 *
 * ¿Por qué no extender NameStyle?
 * Porque son conceptos de negocio distintos. El nombre y la fecha
 * pueden evolucionar independientemente (ej: la fecha podría tener
 * un campo de formato "DD/MM/YYYY" vs "Month DD, YYYY" en el futuro).
 */
export interface DateStyle {
  show: boolean;
  positionX: number;
  positionY: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  align: 'left' | 'center';
}

export const DEFAULT_DATE_STYLE: DateStyle = {
  show: true,
  positionX: 0,
  positionY: 0,
  fontSize: 18,
  color: '#000000',
  fontFamily: 'Helvetica',
  align: 'left',
};
