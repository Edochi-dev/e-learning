/**
 * DateStyle — Value Object que agrupa la configuración visual de la fecha.
 *
 * Clase (no interface) porque TypeORM + emitDecoratorMetadata necesita
 * un tipo que exista en runtime para el decorador @Column('jsonb').
 */
export class DateStyle {
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
