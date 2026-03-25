// Esta es la definición ÚNICA de un curso para todo el proyecto

// ─── Lesson Type ───────────────────────────────────────────────────────
// Discriminador de tipo de lección: una lección puede ser una clase (video)
// o un examen (quiz). Mismo patrón "const + as const" que UserRole y OrderStatus.
export const LessonType = {
    CLASS: 'class',
    EXAM: 'exam',
} as const;

export type LessonType = typeof LessonType[keyof typeof LessonType];

// ─── Quiz ──────────────────────────────────────────────────────────────

export interface QuizOption {
    id: string;
    text: string;
    isCorrect: boolean; // Solo visible para el admin; el backend lo omite al enviar al alumno
}

export interface QuizQuestion {
    id: string;
    text: string;
    order: number;
    options: QuizOption[];
    relatedLessonId?: string;    // FK a la lección de video donde se explica el tema
    relatedLessonTitle?: string; // Se resuelve en el backend (join); usado para el hint al alumno
}

export interface Lesson {
    id: string;
    title: string;
    description: string;
    type: LessonType;         // 'class' (video) o 'exam' (quiz)
    duration?: string;        // Solo para class — Ej: "10:00", "1h 30m"
    videoUrl?: string;        // Solo para class — URL del video
    order: number;            // Posición dentro del curso (0, 1, 2...)
    isLive: boolean;          // Solo para class — True si es en vivo
    passingScore?: number;    // Solo para exam — respuestas correctas mínimas para aprobar
    questions?: QuizQuestion[]; // Solo para exam — preguntas del quiz
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
    type: LessonType;                     // 'class' o 'exam'
    duration?: string;                    // Solo para class
    videoUrl?: string;                    // Obligatorio para class, no aplica para exam
    isLive?: boolean;                     // Solo para class
    passingScore?: number;                // Solo para exam
    questions?: CreateQuizQuestionPayload[]; // Solo para exam
}

export interface CreateQuizQuestionPayload {
    text: string;
    relatedLessonId?: string;             // Lección de video donde se explica el tema
    options: CreateQuizOptionPayload[];
}

export interface CreateQuizOptionPayload {
    text: string;
    isCorrect: boolean;
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
    type?: LessonType;
    duration?: string;
    videoUrl?: string;
    isLive?: boolean;
    passingScore?: number;
    questions?: CreateQuizQuestionPayload[];
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

// ─── Quiz Submission & Results ─────────────────────────────────────────

/**
 * SubmitQuizPayload — Lo que el alumno envía al contestar un quiz.
 *
 * Cada "answer" es: "para esta pregunta, elegí esta opción".
 * El backend evalúa internamente si la opción es correcta o no.
 */
export interface SubmitQuizPayload {
    lessonId: string;
    courseId: string;
    answers: QuizAnswer[];
}

export interface QuizAnswer {
    questionId: string;
    selectedOptionId: string;
}

/**
 * QuizResultDetail — Feedback por cada pregunta del quiz.
 *
 * - Si `correct: true` → el alumno acertó (se muestra en verde).
 * - Si `correct: false` → el alumno falló. NO se revela la respuesta correcta,
 *   pero se muestra `relatedLessonTitle` como hint ("Repasa: Lección X").
 */
export interface QuizResultDetail {
    questionId: string;
    correct: boolean;
    selectedOptionId: string;
    relatedLessonId?: string;
    relatedLessonTitle?: string;
}

/**
 * QuizResult — Respuesta del backend tras evaluar un quiz.
 */
export interface QuizResult {
    passed: boolean;
    score: number;           // Respuestas correctas
    totalQuestions: number;
    passingScore: number;
    details: QuizResultDetail[];
}
