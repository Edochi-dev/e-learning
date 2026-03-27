/**
 * NameStyle — Value Object que agrupa toda la configuración visual del nombre.
 *
 * Es una CLASE (no interface) porque TypeORM + emitDecoratorMetadata necesita
 * un tipo que exista en runtime. Las interfaces se borran al compilar y el
 * decorador @Column('jsonb') no puede referenciarlas.
 */
export class NameStyle {
  positionX: number;
  positionY: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  align: 'left' | 'center';
}

export const DEFAULT_NAME_STYLE: NameStyle = {
  positionX: 0,
  positionY: 0,
  fontSize: 28,
  color: '#000000',
  fontFamily: 'Helvetica',
  align: 'left',
};
