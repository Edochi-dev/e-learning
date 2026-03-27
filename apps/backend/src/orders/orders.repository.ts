import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderGateway } from './gateways/order.gateway';
import { Order } from './entities/order.entity';
import { OrderStatus } from '@maris-nails/shared';

/**
 * OrdersRepository — Implementación concreta del OrderGateway con TypeORM.
 *
 * Es el ÚNICO archivo del módulo de órdenes que sabe de TypeORM/PostgreSQL.
 * Los Use Cases solo conocen el contrato abstracto OrderGateway.
 */
@Injectable()
export class OrdersRepository implements OrderGateway {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(
    data: Pick<Order, 'userId' | 'courseId' | 'amount' | 'status'>,
  ): Promise<Order> {
    const order = this.orderRepository.create(data);
    return this.orderRepository.save(order);
  }

  async findById(id: string): Promise<Order | null> {
    return this.orderRepository.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await this.orderRepository.update(id, { status });
  }

  /**
   * Retorna las órdenes del usuario, de más reciente a más antigua.
   * Incluimos la relación 'course' para mostrar el título en el historial.
   */
  async findByUser(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Busca una orden completada para un usuario y curso específicos.
   * Si existe, significa que el usuario ya pagó por ese curso.
   */
  async findCompletedByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { userId, courseId, status: OrderStatus.COMPLETED },
    });
  }
}
