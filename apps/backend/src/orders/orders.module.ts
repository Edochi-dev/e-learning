import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { ManualApprovalPaymentGateway } from './manual-approval-payment.gateway';
import { OrderGateway } from './gateways/order.gateway';
import { PaymentGateway } from './gateways/payment.gateway';
import { Order } from './entities/order.entity';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';
import { GetMyOrdersUseCase } from './use-cases/get-my-orders.use-case';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

/**
 * OrdersModule — El "pegamento" del módulo de compras.
 *
 * imports:
 *   - TypeOrmModule.forFeature([Order])
 *       Registra la entidad Order para que TypeORM cree el repositorio.
 *
 *   - CoursesModule
 *       CreateOrderUseCase necesita CourseGateway para verificar que el
 *       curso existe y leer su precio. CoursesModule lo exporta.
 *
 *   - EnrollmentsModule
 *       CreateOrderUseCase necesita EnrollmentGateway para matricular
 *       al usuario automáticamente después de un pago exitoso.
 *
 * providers — Los bindings clave de Clean Architecture:
 *
 *   { provide: OrderGateway, useClass: OrdersRepository }
 *       Persistencia → hoy TypeORM/Postgres, mañana lo que sea.
 *
 *   { provide: PaymentGateway, useClass: ManualApprovalPaymentGateway }
 *       Pagos → hoy auto-aprueba, mañana Stripe/MercadoPago.
 *       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *       ESTA ES LA LÍNEA QUE SE CAMBIA cuando el cliente tenga
 *       su procesador de pagos listo. Nada más se toca.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    CoursesModule,
    EnrollmentsModule,
  ],
  controllers: [OrdersController],
  providers: [
    { provide: OrderGateway, useClass: OrdersRepository },
    { provide: PaymentGateway, useClass: ManualApprovalPaymentGateway },
    CreateOrderUseCase,
    GetMyOrdersUseCase,
  ],
})
export class OrdersModule {}
