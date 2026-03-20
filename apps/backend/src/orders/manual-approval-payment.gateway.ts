import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway, PaymentResult } from './gateways/payment.gateway';

/**
 * ManualApprovalPaymentGateway — Aprueba todas las compras automáticamente.
 *
 * Esta es la implementación TEMPORAL del PaymentGateway.
 * Se usa mientras el cliente completa los trámites legales para
 * integrar un procesador de pagos real (Stripe, MercadoPago, etc.).
 *
 * ¿Qué hace?
 *   Siempre retorna { success: true }. No cobra nada.
 *   Loguea la "transacción" para que quede registro en los logs del servidor.
 *
 * ¿Cuándo se reemplaza?
 *   Cuando el cliente tenga su cuenta de procesador de pagos lista.
 *   Se crea StripePaymentGateway (o el que sea) y se cambia el binding:
 *
 *   // orders.module.ts — ANTES:
 *   { provide: PaymentGateway, useClass: ManualApprovalPaymentGateway }
 *
 *   // orders.module.ts — DESPUÉS:
 *   { provide: PaymentGateway, useClass: StripePaymentGateway }
 *
 *   Nada más cambia. Los Use Cases y el Controller siguen iguales.
 */
@Injectable()
export class ManualApprovalPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(ManualApprovalPaymentGateway.name);

  async processPayment(
    userId: string,
    courseId: string,
    amount: number,
  ): Promise<PaymentResult> {
    this.logger.log(
      `Pago auto-aprobado: usuario=${userId}, curso=${courseId}, monto=$${amount}`,
    );

    return { success: true };
  }
}
