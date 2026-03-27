import { Order } from '../entities/order.entity';
import { OrderStatus } from '@maris-nails/shared';

/**
 * OrderGateway — Contrato abstracto para la persistencia de órdenes.
 *
 * Mismo patrón que CourseGateway y EnrollmentGateway:
 * los Use Cases dependen de esta abstracción, NUNCA del repositorio concreto.
 *
 * Hoy la implementación usa TypeORM + PostgreSQL.
 * Si mañana quisieras usar DynamoDB o un microservicio externo,
 * solo creas una nueva clase que implemente estos métodos y cambias
 * el binding en orders.module.ts. Los Use Cases no se tocan.
 */
export abstract class OrderGateway {
  /** Persiste una nueva orden en la base de datos. */
  abstract create(
    data: Pick<Order, 'userId' | 'courseId' | 'amount' | 'status'>,
  ): Promise<Order>;

  /** Busca una orden por su ID. */
  abstract findById(id: string): Promise<Order | null>;

  /** Actualiza el estado de una orden existente. */
  abstract updateStatus(id: string, status: OrderStatus): Promise<void>;

  /**
   * Retorna todas las órdenes de un usuario, ordenadas de más reciente a más antigua.
   * Incluye la relación con Course para mostrar el título en el historial.
   */
  abstract findByUser(userId: string): Promise<Order[]>;

  /**
   * Busca una orden completada de un usuario para un curso específico.
   * Útil para verificar si el usuario ya compró ese curso antes de crear otra orden.
   */
  abstract findCompletedByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Order | null>;
}
