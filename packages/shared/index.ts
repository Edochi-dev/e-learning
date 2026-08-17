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
    liveStartsAt?: string;   // ISO 8601 — obligatorio cuando isLive (fecha/hora de la clase en vivo)
    liveEndsAt?: string;     // ISO 8601 — obligatorio cuando isLive
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

/**
 * CourseLevel — Nivel del curso, para clasificar y filtrar en el catálogo.
 * Mismo patrón "const + as const" que UserRole/LessonType/OrderStatus.
 */
export const CourseLevel = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
} as const;

export type CourseLevel = typeof CourseLevel[keyof typeof CourseLevel];

export interface Course {
    id: string;
    title: string;
    price: number;
    description: string;
    thumbnailUrl?: string;
    // Taxonomía para descubrimiento (opcionales: los cursos viejos no la tienen).
    category?: string;      // Categoría libre, ej: "Uñas Acrílicas", "Nail Art"
    level?: CourseLevel;    // Nivel: principiante / intermedio / avanzado
    accessDurationDays?: number | null; // null = acceso permanente
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

/**
 * NameChangeRequestStatus — Ciclo de vida de una solicitud de cambio de nombre.
 *
 * El alumno NO cambia su nombre libremente (evitaría fraude: varios nombres
 * para recibir varios certificados). En su lugar SOLICITA el cambio y un admin
 * lo revisa:
 *   Alumno solicita → PENDING
 *   Admin aprueba    → APPROVED  (se aplica el nuevo fullName; las iniciales del
 *                                 avatar se derivan del nombre, así que se
 *                                 regeneran solas)
 *   Admin rechaza    → REJECTED  (con motivo en feedback)
 */
export const NameChangeRequestStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const;

export type NameChangeRequestStatus = typeof NameChangeRequestStatus[keyof typeof NameChangeRequestStatus];

export interface NameChangeRequest {
    id: string;
    userId: string;
    currentName: string;    // Snapshot del nombre al momento de solicitar
    requestedName: string;
    status: NameChangeRequestStatus;
    feedback?: string;      // Nota del admin (motivo al rechazar / comentario)
    createdAt: string;      // ISO 8601 — cuándo se solicitó
    reviewedAt?: string;    // ISO 8601 — cuándo el admin revisó
}

/**
 * ScheduleEvent — Evento de la agenda del panel admin.
 *
 * La educadora lleva su horario aquí: eventos con nombre libre y horas. Los
 * eventos POR HORA no se solapan entre sí; los de "todo el día"/multidía son
 * telón de fondo y no bloquean. `sourceType` distingue eventos personales de
 * los espejos de clases en vivo programadas (esos se editan desde su curso).
 */
export const CalendarSourceType = {
    PERSONAL: 'personal',
    LIVE_LESSON: 'live_lesson',
} as const;

export type CalendarSourceType = typeof CalendarSourceType[keyof typeof CalendarSourceType];

export interface ScheduleEvent {
    id: string;
    title: string;
    startAt: string;    // ISO 8601
    endAt: string;      // ISO 8601
    allDay: boolean;
    notes?: string;
    reminderMinutesBefore?: number | null; // minutos de anticipación del aviso (null = sin recordatorio)
    sourceType: CalendarSourceType;
    sourceId?: string;  // id de la lección en vivo cuando sourceType = live_lesson
    createdAt: string;
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
    category?: string;
    level?: CourseLevel;
    thumbnailUrl?: string;
    features?: string[];
    // Días de acceso que otorgará cada matrícula. null / omitido = permanente.
    // Cambiarlo después NO afecta a las matrículas ya emitidas: cada una
    // congela su propia fecha de vencimiento.
    accessDurationDays?: number | null;
}

// ─── Create Lesson Payloads (Discriminated Union) ────────────────────
// Cada tipo de lección define su propia forma de payload.
// El campo `type` actúa como discriminador: TypeScript sabe exactamente
// qué campos son válidos según el tipo. Imposible mezclar campos de
// un tipo con otro — el compilador lo impide.

export interface CreateClassLessonPayload {
    type: typeof LessonType.CLASS;
    title: string;
    description: string;
    videoUrl: string;
    duration?: string;
    isLive?: boolean;
    liveStartsAt?: string;   // ISO — obligatorio cuando isLive
    liveEndsAt?: string;
}

export interface CreateExamLessonPayload {
    type: typeof LessonType.EXAM;
    title: string;
    description: string;
    passingScore: number;
    questions: CreateQuizQuestionPayload[];
}

export interface CreateCorrectionLessonPayload {
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
    // null para PODER limpiar el valor (vaciar categoría/nivel de un curso).
    category?: string | null;
    level?: CourseLevel | null;
    thumbnailUrl?: string;
    features?: string[];
    accessDurationDays?: number | null;
}

// ─── Update Lesson Payloads (Discriminated Union) ────────────────────
// Mismo principio que Create, pero todos los campos son opcionales
// (actualización parcial). El `type` es obligatorio porque al actualizar
// ya sabés qué tipo de lección es — y eso determina qué campos aceptás.

export interface UpdateClassLessonPayload {
    type: typeof LessonType.CLASS;
    title?: string;
    description?: string;
    videoUrl?: string;
    duration?: string;
    isLive?: boolean;
    liveStartsAt?: string;   // ISO — obligatorio cuando isLive
    liveEndsAt?: string;
}

export interface UpdateExamLessonPayload {
    type: typeof LessonType.EXAM;
    title?: string;
    description?: string;
    passingScore?: number;
    questions?: CreateQuizQuestionPayload[];
}

export interface UpdateCorrectionLessonPayload {
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

/**
 * LastQuizAttemptResponse — Info del último intento de un alumno en un quiz.
 *
 * Se usa al cargar el QuizPlayer para decidir qué mostrar:
 * - Si el alumno aprobó: mostrar pantalla de resultados PERMANENTE (nunca
 *   puede re-intentar un quiz ya aprobado, evita confusión).
 * - Si reprobó y está en cooldown: mostrar resultados con countdown activo.
 * - Si reprobó y cooldown expiró: mostrar resultados con botón "reintentar".
 * - Si no hay intentos previos: result === null, el frontend muestra
 *   el formulario vacío.
 *
 * El endpoint SIEMPRE devuelve este objeto (nunca `null` a nivel root)
 * porque NestJS serializa `return null` como body vacío y rompe
 * response.json() en el frontend. `result: null` es el caso "sin intentos".
 *
 * cooldownRemainingMs es 0 cuando ya no aplica (aprobado, o expiró, o
 * nunca intentó).
 */
export interface LastQuizAttemptResponse {
    result: QuizResult | null;
    cooldownRemainingMs: number;
}

/**
 * PaginatedResult<T> — Envoltura estándar de las respuestas paginadas del API.
 *
 * Fuente ÚNICA de este contrato: lo usan tanto el backend (que lo re-exporta
 * desde common/types) como el frontend. Así, si cambia la forma de la
 * paginación, hay un solo lugar que tocar y ambos lados quedan sincronizados.
 *
 *   data  → los elementos de la página actual
 *   total → total de elementos en TODAS las páginas (para calcular cuántas hay)
 *   page  → número de página actual (1-based)
 *   limit → tamaño de página (elementos por página)
 */
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

/**
 * ApiErrorCode — Códigos estables que el backend adjunta a ciertos errores para
 * que el frontend pueda reaccionar de forma distinta a cada uno.
 *
 * Existen porque el mensaje de error es texto para humanos: cambiarlo o
 * traducirlo NO debe romper la interfaz. El frontend ramifica por el código,
 * nunca comparando el mensaje.
 *
 *   ENROLLMENT_EXPIRED → tuvo acceso y se le venció (ofrecer renovar)
 *   NOT_ENROLLED       → nunca tuvo acceso a este curso (ofrecer comprar)
 */
export const ApiErrorCode = {
    ENROLLMENT_EXPIRED: 'ENROLLMENT_EXPIRED',
    NOT_ENROLLED: 'NOT_ENROLLED',
} as const;

export type ApiErrorCode = typeof ApiErrorCode[keyof typeof ApiErrorCode];
