import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { OrderStatus } from '@maris-nails/shared';

/**
 * Order — Registro de una compra de curso.
 *
 * ¿Cuál es la diferencia entre Order y Enrollment?
 *
 *   Order      = "Fabiola pagó $50 por Manicure Básico el 20 de marzo"
 *   Enrollment = "Fabiola tiene acceso a Manicure Básico"
 *
 * Son conceptos separados por diseño:
 *   - Una Order COMPLETED crea un Enrollment (acceso al curso).
 *   - Si se hace un reembolso, se elimina el Enrollment pero la Order
 *     queda como registro histórico.
 *   - Un admin podría dar acceso gratuito (Enrollment sin Order).
 *
 * ¿Por qué amount es una columna propia y no se lee del curso?
 *   Porque el precio del curso puede cambiar. La Order congela el precio
 *   al momento de la compra. Si "Manicure Básico" costaba $50 cuando
 *   Fabiola compró, eso queda fijo aunque después suba a $70.
 *
 * ¿Por qué NO hay @Unique en [userId, courseId]?
 *   A diferencia de Enrollment, una orden fallida no debería impedir
 *   un segundo intento de compra. El usuario puede tener varias órdenes
 *   para el mismo curso (una FAILED y luego una COMPLETED).
 */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_orders_userId')
  @Column({ type: 'uuid' })
  userId: string;

  @Index('IDX_orders_courseId')
  @Column({ type: 'uuid' })
  courseId: string;

  /**
   * Precio congelado al momento de la compra.
   * decimal(10,2) → hasta 99,999,999.99 — suficiente para cursos.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  /**
   * Estado de la orden: OrderStatus.PENDING | COMPLETED | FAILED.
   * Arranca siempre en PENDING y el PaymentGateway lo actualiza.
   *
   * Usamos el enum de @maris-nails/shared para que TypeScript rechace
   * cualquier string inválido en tiempo de compilación. Un typo como
   * 'complted' ya no pasa silencioso — el compilador lo atrapa.
   */
  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relaciones ──

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_orders_userId',
  })
  user: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'courseId',
    foreignKeyConstraintName: 'FK_orders_courseId',
  })
  course: Course;
}
