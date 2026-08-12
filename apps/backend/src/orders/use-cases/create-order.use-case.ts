import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderGateway } from '../gateways/order.gateway';
import { PaymentGateway, PaymentOutcome } from '../gateways/payment.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '@maris-nails/shared';

/**
 * CreateOrderUseCase — Orquesta el flujo completo de compra directa.
 *
 * Este es el Use Case más importante del módulo. Coordina:
 *   1. Validaciones de negocio (¿existe el curso?, ¿ya lo compró?)
 *   2. Creación de la orden (status: pending)
 *   3. Procesamiento del pago (vía PaymentGateway abstracto)
 *   4. Actualización de la orden según el desenlace
 *   5. Matrícula SOLO si el pago quedó COMPLETED
 *
 * ¿Por qué depende de 4 gateways?
 *
 *   - OrderGateway      → para persistir/actualizar la orden
 *   - PaymentGateway    → para procesar el pago (hoy PENDING, mañana Stripe)
 *   - CourseGateway     → para verificar que el curso existe y obtener el precio
 *   - EnrollmentGateway → para crear la matrícula cuando el pago se confirma
 *
 * Todos son abstractos. El Use Case no sabe si estás en PostgreSQL, MongoDB,
 * o si el pago va por Stripe o MercadoPago. Solo conoce los contratos.
 *
 * REGLA DE SEGURIDAD: solo COMPLETED otorga acceso. PENDING y FAILED no
 * matriculan. Cubierto por tests.
 */
@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly orderGateway: OrderGateway,
    private readonly paymentGateway: PaymentGateway,
    private readonly courseGateway: CourseGateway,
    private readonly enrollmentGateway: EnrollmentGateway,
  ) {}

  async execute(userId: string, courseId: string): Promise<Order> {
    // 1. ¿El curso existe?
    const course = await this.courseGateway.findOne(courseId);
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    // 2. ¿Ya lo compró antes? (orden completada = ya tiene acceso)
    const existingOrder =
      await this.orderGateway.findCompletedByUserAndCourse(userId, courseId);
    if (existingOrder) {
      throw new ConflictException('Ya compraste este curso');
    }

    // 3. Crear la orden en estado PENDING con el precio congelado
    const order = await this.orderGateway.create({
      userId,
      courseId,
      amount: course.price,
      status: OrderStatus.PENDING,
    });

    // 4. Procesar el pago (hoy: auto-aprobado, mañana: Stripe/MercadoPago)
    const paymentResult = await this.paymentGateway.processPayment(
      userId,
      courseId,
      course.price,
    );

    // 5. Actualizar la orden y, solo si el dinero está confirmado, matricular.
    switch (paymentResult.outcome) {
      case PaymentOutcome.COMPLETED: {
        await this.orderGateway.updateStatus(order.id, OrderStatus.COMPLETED);
        order.status = OrderStatus.COMPLETED;

        // Puede ya estar matriculada si la admin le dio acceso por invitación.
        const existingEnrollment =
          await this.enrollmentGateway.findByUserAndCourse(userId, courseId);
        if (!existingEnrollment) {
          await this.enrollmentGateway.enroll(userId, courseId);
        }
        break;
      }

      case PaymentOutcome.PENDING:
        // La orden ya nació PENDING: no hay nada que actualizar ni que otorgar.
        break;

      case PaymentOutcome.FAILED:
        await this.orderGateway.updateStatus(order.id, OrderStatus.FAILED);
        order.status = OrderStatus.FAILED;
        break;
    }

    return order;
  }
}
