import { Injectable } from '@nestjs/common';
import { OrderGateway } from '../gateways/order.gateway';
import { Order } from '../entities/order.entity';

/**
 * GetMyOrdersUseCase — Devuelve el historial de compras del usuario.
 *
 * Es un Use Case sencillo (solo delega al gateway), pero existe como
 * clase separada por dos razones:
 *
 * 1. Consistencia: todos los endpoints pasan por un Use Case.
 *    El Controller nunca habla directo con el gateway.
 *
 * 2. Extensibilidad: si mañana necesitas agregar lógica (filtrar por fecha,
 *    paginar, enriquecer con datos del curso), solo modificas este archivo.
 *    El Controller no se toca.
 */
@Injectable()
export class GetMyOrdersUseCase {
  constructor(private readonly orderGateway: OrderGateway) {}

  async execute(userId: string): Promise<Order[]> {
    return this.orderGateway.findByUser(userId);
  }
}
