/**
 * NameStyle — Value Object que agrupa toda la configuración visual del nombre.
 *
 * En DDD, un Value Object es un objeto definido por sus atributos, no por una identidad.
 * No tiene ID propio — dos NameStyle con los mismos valores son iguales.
 *
 * Antes, estos 6 campos vivían sueltos como columnas planas en CertificateTemplate.
 * Ahora son un grupo cohesivo almacenado como jsonb en PostgreSQL.
 */
export interface NameStyle {
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
