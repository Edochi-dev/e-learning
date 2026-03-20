import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderGateway } from '../gateways/order.gateway';
import { PaymentGateway } from '../gateways/payment.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { Order } from '../entities/order.entity';

/**
 * CreateOrderUseCase — Orquesta el flujo completo de compra directa.
 *
 * Este es el Use Case más importante del módulo. Coordina:
 *   1. Validaciones de negocio (¿existe el curso?, ¿ya lo compró?)
 *   2. Creación de la orden (status: pending)
 *   3. Procesamiento del pago (vía PaymentGateway abstracto)
 *   4. Actualización de la orden (completed o failed)
 *   5. Matrícula automática si el pago fue exitoso
 *
 * ¿Por qué depende de 4 gateways?
 *
 *   - OrderGateway     → para persistir/actualizar la orden
 *   - PaymentGateway   → para procesar el pago (hoy auto-aprueba, mañana Stripe)
 *   - CourseGateway     → para verificar que el curso existe y obtener el precio
 *   - EnrollmentGateway → para crear la matrícula automáticamente tras el pago
 *
 * Todos son abstractos. El Use Case no sabe si estás en PostgreSQL, MongoDB,
 * o si el pago va por Stripe o MercadoPago. Solo conoce los contratos.
 *
 * ¿Por qué el enrollment se crea aquí y no en otro lugar?
 *
 *   Porque la regla de negocio es: "pago exitoso → acceso inmediato".
 *   Si lo hicieras en el Controller, estarías poniendo lógica de negocio
 *   en la capa de transporte (violación de Clean Architecture).
 *   Si lo hicieras en un evento asíncrono, el usuario podría tener que
 *   esperar para ver su curso — mala experiencia.
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
      status: 'pending',
    });

    // 4. Procesar el pago (hoy: auto-aprobado, mañana: Stripe/MercadoPago)
    const paymentResult = await this.paymentGateway.processPayment(
      userId,
      courseId,
      course.price,
    );

    // 5. Actualizar la orden según el resultado del pago
    if (paymentResult.success) {
      await this.orderGateway.updateStatus(order.id, 'completed');
      order.status = 'completed';

      // 6. Matricular automáticamente al usuario en el curso.
      //    Si ya estaba matriculado (ej: admin le dio acceso antes), no falla
      //    porque findByUserAndCourse lo detecta silenciosamente.
      const existingEnrollment =
        await this.enrollmentGateway.findByUserAndCourse(userId, courseId);
      if (!existingEnrollment) {
        await this.enrollmentGateway.enroll(userId, courseId);
      }
    } else {
      await this.orderGateway.updateStatus(order.id, 'failed');
      order.status = 'failed';
    }

    return order;
  }
}
