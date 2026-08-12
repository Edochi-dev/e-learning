/**
 * PaymentOutcome — Desenlace de un intento de pago.
 *
 * Tres estados y no un booleano, porque una transferencia o un pago en
 * efectivo quedan PENDIENTES hasta que alguien los confirma.
 *
 *   COMPLETED → dinero confirmado. Solo este desenlace otorga acceso.
 *   PENDING   → intento registrado, sin confirmar.
 *   FAILED    → rechazado.
 */
export const PaymentOutcome = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  FAILED: 'failed',
} as const;

export type PaymentOutcome =
  (typeof PaymentOutcome)[keyof typeof PaymentOutcome];

/**
 * PaymentResult — Lo que devuelve cualquier procesador de pagos.
 *
 * Cuando se integre Stripe/MercadoPago se pueden agregar campos como
 * transactionId o receiptUrl sin romper los Use Cases existentes.
 */
export interface PaymentResult {
  outcome: PaymentOutcome;
  /** Motivo, cuando el desenlace no es COMPLETED. */
  reason?: string;
}

/**
 * PaymentGateway — Contrato abstracto para procesar pagos.
 *
 * Esta es la pieza CLAVE de la Clean Architecture aquí.
 *
 * ¿Por qué es abstracta?
 *   Porque HOY no hay medios de pago (el cliente está en trámites legales).
 *   Pero el flujo de compra necesita funcionar desde ya.
 *
 *   La implementación actual (ManualApprovalPaymentGateway) deja toda compra
 *   en PENDING: registra la intención sin cobrar y sin otorgar acceso.
 *
 *   Cuando el cliente tenga sus trámites listos, se crea una nueva clase:
 *     - StripePaymentGateway
 *     - MercadoPagoPaymentGateway
 *     - PayPalPaymentGateway
 *
 *   Y se cambia UNA SOLA LÍNEA en orders.module.ts:
 *     { provide: PaymentGateway, useClass: StripePaymentGateway }
 *
 *   Los Use Cases nunca se enteran del cambio. Eso es el poder de la
 *   inversión de dependencias (la D de SOLID).
 *
 * ¿Por qué recibe userId, courseId y amount por separado?
 *   Para no acoplar el gateway a la entidad Order de TypeORM.
 *   Un procesador de pagos externo no necesita saber de tu ORM.
 */
export abstract class PaymentGateway {
  abstract processPayment(
    userId: string,
    courseId: string,
    amount: number,
  ): Promise<PaymentResult>;
}
