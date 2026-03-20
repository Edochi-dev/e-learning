/**
 * PaymentResult — Lo que devuelve cualquier procesador de pagos.
 *
 * Es intencionalmente simple: éxito o fracaso + un motivo.
 * Cuando se integre Stripe/MercadoPago, se pueden agregar campos como
 * transactionId, receiptUrl, etc. sin romper los Use Cases existentes.
 */
export interface PaymentResult {
  success: boolean;
  /** Razón del fallo (solo cuando success=false). */
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
 *   La implementación actual (ManualApprovalPaymentGateway) aprueba todo
 *   automáticamente — simula un pago exitoso sin tocar ningún procesador real.
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
