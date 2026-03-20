import type { Order } from '@maris-nails/shared';

/**
 * OrderGateway (Frontend) — Contrato para las operaciones de compra.
 *
 * Mismo patrón que CourseGateway y EnrollmentGateway:
 * define QUÉ operaciones existen, no CÓMO se hacen.
 *
 * HttpOrderGateway implementa estas operaciones via fetch().
 * Si mañana la API cambia, solo se modifica la implementación.
 */
export interface OrderGateway {
    /** Crea una orden de compra para un curso. Retorna la orden con su status final. */
    createOrder(courseId: string): Promise<Order>;

    /** Devuelve el historial de compras del usuario autenticado. */
    getMyOrders(): Promise<Order[]>;
}
