/**
 * QrStyle — Value Object que agrupa la configuración del código QR.
 *
 * Clase (no interface) porque TypeORM + emitDecoratorMetadata necesita
 * un tipo que exista en runtime para el decorador @Column('jsonb').
 */
export class QrStyle {
  positionX: number;
  positionY: number;
  size: number;
}

export const DEFAULT_QR_STYLE: QrStyle = {
  positionX: 0,
  positionY: 0,
  size: 80,
};
