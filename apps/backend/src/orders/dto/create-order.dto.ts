import { IsUUID } from 'class-validator';

/**
 * CreateOrderDto — Datos que el frontend envía para comprar un curso.
 *
 * Solo necesitamos courseId. ¿Por qué no enviamos el precio?
 *   Porque el precio lo lee el backend directamente del curso en la DB.
 *   Si el frontend enviara el precio, un atacante podría manipularlo
 *   (ej: enviar price=0 y llevarse el curso gratis).
 *
 * El userId se extrae del JWT en el Controller, nunca del body.
 */
export class CreateOrderDto {
  @IsUUID()
  courseId: string;
}
