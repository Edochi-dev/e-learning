import { AssignmentSubmission } from '../entities/assignment-submission.entity';

/**
 * CreateSubmissionData / UpdateSubmissionData — Tipos planos para el gateway.
 *
 * Mismo patrón que CreateCourseData/UpdateCourseData en el módulo de cursos:
 * el gateway recibe datos planos, no entidades de persistencia. El repositorio
 * es quien sabe cómo convertirlos en entidades TypeORM.
 */
export interface CreateSubmissionData {
  studentId: string;
  lessonId: string;
  photoUrl: string;
}

export interface UpdateSubmissionData {
  photoUrl?: string;
  status?: string;
  feedback?: string;
  reviewedAt?: Date;
  submittedAt?: Date;
}

/**
 * CorrectionGateway — Contrato abstracto para operaciones de correcciones.
 *
 * Segregado en su propio módulo (no en enrollments ni en courses) porque
 * las correcciones son un dominio con su propia lógica:
 *   - Submissions de alumnas
 *   - Reviews de la profesora
 *   - Notificaciones
 *   - Limpieza de archivos
 *
 * Los use cases de Fase 5 y 6 dependerán solo de este contrato.
 */
export abstract class CorrectionGateway {
  /** Busca una submission por la combinación (studentId, lessonId). */
  abstract findByStudentAndLesson(
    studentId: string,
    lessonId: string,
  ): Promise<AssignmentSubmission | null>;

  /** Busca una submission por su ID. */
  abstract findById(id: string): Promise<AssignmentSubmission | null>;

  /** Crea una nueva submission. */
  abstract create(data: CreateSubmissionData): Promise<AssignmentSubmission>;

  /** Actualiza una submission existente (re-envío, aprobación, rechazo). */
  abstract update(
    id: string,
    data: UpdateSubmissionData,
  ): Promise<AssignmentSubmission>;

  /** Lista todas las submissions con status 'pending'. */
  abstract findPending(): Promise<AssignmentSubmission[]>;

  /** Lista todas las submissions (con filtros opcionales para el histórico). */
  abstract findAll(filters?: {
    status?: string;
    lessonId?: string;
    studentId?: string;
  }): Promise<AssignmentSubmission[]>;
}
