export const API_URL = import.meta.env.VITE_API_URL as string;

/**
 * Pagos en línea (issue #27). Apagado, la ficha ofrece inscribirse por
 * WhatsApp en vez de crear órdenes que nadie cobra.
 */
export const ONLINE_PAYMENTS = import.meta.env.VITE_ONLINE_PAYMENTS === 'true';
