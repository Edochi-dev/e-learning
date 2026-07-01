/**
 * Re-exporta el contrato de paginación desde el paquete compartido, que es la
 * fuente ÚNICA de verdad (lo usan backend y frontend por igual).
 *
 * Mantener este archivo como punto de importación evita tener que actualizar
 * todos los use-cases/gateways/controllers que ya importan desde aquí: siguen
 * funcionando, pero ahora apuntan al tipo compartido. Es un re-export SOLO de
 * tipo, así que se borra en compilación (cero impacto en runtime).
 *
 * Seguro para el deploy: el hook `prebuild` del backend compila `shared` antes
 * de `nest build`, así que su dist siempre tiene este tipo.
 */
export type { PaginatedResult } from '@maris-nails/shared';
