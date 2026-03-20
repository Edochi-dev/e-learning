import type { Order } from '@maris-nails/shared';
import type { OrderGateway } from './OrderGateway';

/**
 * HttpOrderGateway — Implementación concreta que habla con el backend via fetch().
 *
 * Mismo patrón que HttpEnrollmentGateway:
 *   - El JWT viaja en cookie HttpOnly (credentials: 'include')
 *   - Si la respuesta no es OK, lanza un Error con el mensaje del backend
 *
 * Es el ÚNICO archivo del frontend que sabe las URLs del módulo de órdenes.
 */
export class HttpOrderGateway implements OrderGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async createOrder(courseId: string): Promise<Order> {
        const response = await fetch(`${this.baseUrl}/orders/me`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ courseId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'No se pudo completar la compra');
        }

        return response.json();
    }

    async getMyOrders(): Promise<Order[]> {
        const response = await fetch(`${this.baseUrl}/orders/me`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('No se pudo cargar el historial de compras');
        }

        return response.json();
    }
}
