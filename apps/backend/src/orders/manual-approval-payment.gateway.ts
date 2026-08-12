import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentGateway,
  PaymentOutcome,
  PaymentResult,
} from './gateways/payment.gateway';

/**
 * ManualApprovalPaymentGateway — Implementación temporal, mientras no hay
 * pasarela de pago integrada.
 *
 * Devuelve siempre PENDING: registra la intención de compra sin cobrar y sin
 * otorgar acceso. NO cambiar a COMPLETED para "destrabar" el flujo — eso
 * regalaría acceso a cualquiera que llame al endpoint.
 *
 * Para integrar un procesador real, crear su gateway y cambiar el binding en
 * orders.module.ts. Los Use Cases no se tocan.
 */
@Injectable()
export class ManualApprovalPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(ManualApprovalPaymentGateway.name);

  processPayment(
    userId: string,
    courseId: string,
    amount: number,
  ): Promise<PaymentResult> {
    this.logger.log(
      `Compra registrada PENDIENTE de aprobación (no se cobró ni se dio acceso): ` +
        `usuario=${userId}, curso=${courseId}, monto=$${amount}`,
    );

    return Promise.resolve({
      outcome: PaymentOutcome.PENDING,
      reason:
        'Pago pendiente de confirmación manual: todavía no hay pasarela de pago integrada.',
    });
  }
}
