// Esta es la definición ÚNICA de un curso para todo el proyecto

// ─── Lesson Type ───────────────────────────────────────────────────────
// Discriminador de tipo de lección: una lección puede ser una clase (video)
// o un examen (quiz). Mismo patrón "const + as const" que UserRole y OrderStatus.
export const LessonType = {
    CLASS: 'class',
    EXAM: 'exam',
    CORRECTION: 'correction',
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

// ─── Lesson Data por tipo ─────────────────────────────────────────────
// Cada tipo de lección tiene datos específicos agrupados en su propia interfaz.
// Esto evita campos nullable sueltos que "solo aplican si type es X".

export interface VideoLessonData {
    videoUrl: string;
    duration?: string;       // Ej: "10:00", "1h 30m". Nullable porque las lecciones en vivo no tienen duración.
    isLive: boolean;
}

export interface ExamLessonData {
    passingScore: number;    // Respuestas correctas mínimas para aprobar
}

export interface AssignmentLessonData {
    referenceImageUrl: string;  // Foto de referencia que sube la profesora
    instructions: string;       // Instrucciones del ejercicio para la alumna
}

// ─── Lesson (base) ───────────────────────────────────────────────────
// Campos comunes a TODA lección. Los datos específicos de cada tipo
// viven en videoData o examData — nunca ambos a la vez.
// El campo `type` indica cuál de los dos está presente.

export interface Lesson {
    id: string;
    title: string;
    description: string;
    type: LessonType;
    order: number;
    videoData?: VideoLessonData;          // Presente solo si type === 'class'
    examData?: ExamLessonData;            // Presente solo si type === 'exam'
    questions?: QuizQuestion[];           // Presente solo si type === 'exam'
    assignmentData?: AssignmentLessonData; // Presente solo si type === 'correction'
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

// ─── Create Lesson Payloads (Discriminated Union) ────────────────────
// Cada tipo de lección define su propia forma de payload.
// El campo `type` actúa como discriminador: TypeScript sabe exactamente
// qué campos son válidos según el tipo. Imposible mezclar campos de
// un tipo con otro — el compilador lo impide.

interface CreateClassLessonPayload {
    type: typeof LessonType.CLASS;
    title: string;
    description: string;
    videoUrl: string;
    duration?: string;
    isLive?: boolean;
}

interface CreateExamLessonPayload {
    type: typeof LessonType.EXAM;
    title: string;
    description: string;
    passingScore: number;
    questions: CreateQuizQuestionPayload[];
}

interface CreateCorrectionLessonPayload {
    type: typeof LessonType.CORRECTION;
    title: string;
    description: string;
    referenceImageUrl: string;
    instructions: string;
}

export type CreateLessonPayload =
    | CreateClassLessonPayload
    | CreateExamLessonPayload
    | CreateCorrectionLessonPayload;

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

// ─── Update Lesson Payloads (Discriminated Union) ────────────────────
// Mismo principio que Create, pero todos los campos son opcionales
// (actualización parcial). El `type` es obligatorio porque al actualizar
// ya sabés qué tipo de lección es — y eso determina qué campos aceptás.

interface UpdateClassLessonPayload {
    type: typeof LessonType.CLASS;
    title?: string;
    description?: string;
    videoUrl?: string;
    duration?: string;
    isLive?: boolean;
}

interface UpdateExamLessonPayload {
    type: typeof LessonType.EXAM;
    title?: string;
    description?: string;
    passingScore?: number;
    questions?: CreateQuizQuestionPayload[];
}

interface UpdateCorrectionLessonPayload {
    type: typeof LessonType.CORRECTION;
    title?: string;
    description?: string;
    referenceImageUrl?: string;
    instructions?: string;
}

export type UpdateLessonPayload =
    | UpdateClassLessonPayload
    | UpdateExamLessonPayload
    | UpdateCorrectionLessonPayload;

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

// ─── Assignment Submission (Correcciones) ────────────────────────────

/**
 * SubmissionStatus — Ciclo de vida de una entrega de corrección.
 *
 * El flujo es:
 *   Alumna sube foto  → PENDING
 *   Profesora aprueba → APPROVED  (lección se marca completa)
 *   Profesora rechaza  → REJECTED  (alumna puede re-enviar → vuelve a PENDING)
 */
export const SubmissionStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const;

export type SubmissionStatus = typeof SubmissionStatus[keyof typeof SubmissionStatus];

/**
 * AssignmentSubmission — Entrega de una alumna para una lección tipo corrección.
 *
 * Una sola fila por (alumna, lección). Si la alumna re-envía, se sobreescribe
 * la foto y el status vuelve a PENDING. El feedback de la profesora se mantiene
 * como audit trail.
 */
export interface AssignmentSubmission {
    id: string;
    lessonId: string;
    studentId: string;
    photoUrl: string;
    status: SubmissionStatus;
    feedback?: string;       // Texto de la profesora (obligatorio al revisar)
    submittedAt: string;     // ISO 8601 — cuándo se envió/re-envió
    reviewedAt?: string;     // ISO 8601 — cuándo la profesora revisó
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
