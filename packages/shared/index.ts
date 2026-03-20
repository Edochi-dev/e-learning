// Esta es la definición ÚNICA de un curso para todo el proyecto

export interface Lesson {
    id: string;
    title: string;
    description: string;
    duration?: string; // Ej: "10:00", "1h 30m" — opcional para lecciones en vivo
    videoUrl: string; // URL del video (YouTube embed o MP4)
    order: number;    // Posición dentro del curso (0, 1, 2...)
    isLive: boolean;  // True si esta lección es en vivo, False si es grabada
}

export interface Course {
    id: string;
    title: string;
    price: number;
    description: string;
    thumbnailUrl?: string;
    features?: string[]; // Beneficios del curso ("Acceso de por vida", "Certificado", etc.)
    lessons: Lesson[];
}

// Este objeto define los roles permitidos en tu academia.
// Usamos "const + as const" en lugar de "enum" porque TypeScript moderno
// (con erasableSyntaxOnly) exige que todo el código sea borrable al compilar.
export const UserRole = {
    ADMIN: 'admin',
    STUDENT: 'student',
} as const;

// Este type reconstruye la unión de valores: 'admin' | 'student'
// Permite usar UserRole como tipo (role: UserRole) igual que antes.
export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface User {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: User;
}

export interface CreateCoursePayload {
    title: string;
    price: number;
    description: string;
    thumbnailUrl?: string;
    features?: string[];
}

export interface CreateLessonPayload {
    title: string;
    description: string;
    duration?: string; // Opcional para lecciones en vivo
    videoUrl: string;
    isLive: boolean;
}

export interface UpdateCoursePayload {
    title?: string;
    price?: number;
    description?: string;
    thumbnailUrl?: string;
    features?: string[];
}

export interface UpdateLessonPayload {
    title?: string;
    description?: string;
    duration?: string;
    videoUrl?: string;
    isLive?: boolean;
}

export interface RegisterPayload {
    fullName: string;
    email: string;
    password: string; // Se envía en texto plano; el backend lo hashea con bcrypt antes de guardar
}

// ─── Orders (Compra directa de cursos) ────────────────────────────────

/**
 * OrderStatus — Ciclo de vida de una orden de compra.
 *
 * El flujo normal es:  PENDING → COMPLETED
 * Si el pago falla:    PENDING → FAILED
 *
 * Usamos "const + as const" por la misma razón que UserRole:
 * erasableSyntaxOnly no permite enums tradicionales en el frontend.
 */
export const OrderStatus = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

/**
 * Order — Representa una compra de un curso por un usuario.
 *
 * ¿Por qué necesitamos esto si ya tenemos Enrollment?
 *
 * Enrollment = "el usuario TIENE acceso al curso" (relación activa).
 * Order = "el usuario PAGÓ por el curso" (registro histórico de la transacción).
 *
 * Una Order COMPLETED genera un Enrollment. Pero si en el futuro se ofrece
 * un reembolso, se puede eliminar el Enrollment sin perder el registro de
 * que hubo una compra (útil para contabilidad, auditoría, soporte).
 *
 * amount se guarda en la Order (y no se lee del Course) porque el precio
 * del curso puede cambiar después. La Order congela el precio al momento
 * de la compra — esto es estándar en cualquier sistema de e-commerce.
 */
export interface Order {
    id: string;
    userId: string;
    courseId: string;
    amount: number;        // Precio congelado al momento de la compra
    status: OrderStatus;
    createdAt: string;     // ISO 8601
}

export interface CreateOrderPayload {
    courseId: string;
}
