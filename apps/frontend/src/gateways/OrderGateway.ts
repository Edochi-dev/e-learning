import type { Order } from '@maris-nails/shared';

/**
 * MyOrder — Una orden del historial, enriquecida con el curso al que pertenece.
 *
 * El backend ya carga la relación `course` en GET /orders/me, así que el JSON
 * trae el título. Extendemos Order aquí (no en shared) para mostrarlo en el
 * historial sin acoplar el paquete compartido a esta vista.
 */
export interface MyOrder extends Order {
    course?: { id: string; title: string };
}

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

    /** Devuelve el historial de compras del usuario autenticado (con su curso). */
    getMyOrders(): Promise<MyOrder[]>;
}
