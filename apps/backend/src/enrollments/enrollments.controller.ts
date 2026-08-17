import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  GetMyEnrollmentsUseCase,
  EnrollmentWithProgress,
} from './use-cases/get-my-enrollments.use-case';
import { MarkLessonCompleteUseCase } from './use-cases/mark-lesson-complete.use-case';
import { UnenrollUseCase } from './use-cases/unenroll.use-case';
import { SaveWatchProgressUseCase } from './use-cases/save-watch-progress.use-case';
import { GetCourseProgressUseCase, CourseProgress } from './use-cases/get-course-progress.use-case';
import { EnrollmentOwnershipGuard } from './guards/enrollment-ownership.guard';
import { EnrollmentGuard } from '../common/guards/enrollment.guard';
import { EnrollmentCheck } from '../common/decorators/enrollment-check.decorator';
import { MarkLessonCompleteDto } from './dto/mark-lesson-complete.dto';
import { SaveWatchProgressDto } from './dto/save-watch-progress.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { SubmitQuizUseCase } from './use-cases/submit-quiz.use-case';
import { GetLastQuizAttemptUseCase } from './use-cases/get-last-quiz-attempt.use-case';
import {
  ListCourseStudentsUseCase,
  CourseStudent,
} from './use-cases/list-course-students.use-case';
import { SetEnrollmentExpiryUseCase } from './use-cases/set-enrollment-expiry.use-case';
import { SetEnrollmentExpiryDto } from './dto/set-enrollment-expiry.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@maris-nails/shared';

/**
 * EnrollmentsController — Endpoints HTTP del sistema de matrículas.
 *
 * Patrón /me: el userId NUNCA viene de la URL. Siempre se extrae de req.user,
 * que fue poblado por AuthGuard('jwt') después de verificar el token.
 *
 * El @UseGuards(AuthGuard('jwt')) a nivel de clase protege TODAS las rutas.
 * No hace falta repetirlo en cada método.
 *
 * Rutas:
 *   GET    /enrollments/me             → Ver mis cursos con progreso
 *   POST   /enrollments/me/progress    → Marcar lección como completada
 *   DELETE /enrollments/:enrollmentId  → Darse de baja (con OwnershipGuard)
 *
 * Ninguna ruta CREA matrículas: ver la nota dentro de la clase.
 */
@Controller('enrollments')
@UseGuards(AuthGuard('jwt'))
export class EnrollmentsController {
  constructor(
    private readonly getMyEnrollmentsUseCase: GetMyEnrollmentsUseCase,
    private readonly markLessonCompleteUseCase: MarkLessonCompleteUseCase,
    private readonly unenrollUseCase: UnenrollUseCase,
    private readonly saveWatchProgressUseCase: SaveWatchProgressUseCase,
    private readonly getCourseProgressUseCase: GetCourseProgressUseCase,
    private readonly submitQuizUseCase: SubmitQuizUseCase,
    private readonly getLastQuizAttemptUseCase: GetLastQuizAttemptUseCase,
    private readonly listCourseStudentsUseCase: ListCourseStudentsUseCase,
    private readonly setEnrollmentExpiryUseCase: SetEnrollmentExpiryUseCase,
  ) {}

  // No hay endpoint de auto-matrícula: sería acceso gratis a cualquier curso.
  // Solo otorgan acceso una orden con pago CONFIRMADO o una invitación de la
  // admin. Si hiciera falta matricular a mano, va bajo /admin con @Roles(ADMIN).

  @Get('me')
  async getMyEnrollments(@Req() req: any): Promise<EnrollmentWithProgress[]> {
    return this.getMyEnrollmentsUseCase.execute(req.user.id);
  }

  @Post('me/progress')
  @UseGuards(EnrollmentGuard)
  @EnrollmentCheck({ lessonIdFrom: 'body', courseIdFrom: 'body' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async markLessonComplete(
    @Req() req: any,
    @Body() dto: MarkLessonCompleteDto,
  ): Promise<void> {
    return this.markLessonCompleteUseCase.execute(req.user.id, dto.lessonId);
  }

  /**
   * GET /enrollments/me/courses/:courseId/progress
   * Devuelve en una sola llamada las lecciones completadas Y el porcentaje visto
   * por lección. El frontend lo usa al montar la página de estudio.
   */
  @Get('me/courses/:courseId/progress')
  @UseGuards(EnrollmentGuard)
  @EnrollmentCheck({ courseIdFrom: 'params' })
  async getCourseProgress(
    @Req() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseProgress> {
    return this.getCourseProgressUseCase.execute(req.user.id, courseId);
  }

  /**
   * PATCH /enrollments/me/watch-progress
   * Guarda el porcentaje de video visto. El frontend lo llama cada vez que
   * el progreso sube 5 puntos (throttle para no saturar la API).
   */
  @Patch('me/watch-progress')
  @UseGuards(EnrollmentGuard)
  @EnrollmentCheck({ lessonIdFrom: 'body', courseIdFrom: 'body' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveWatchProgress(
    @Req() req: any,
    @Body() dto: SaveWatchProgressDto,
  ): Promise<void> {
    return this.saveWatchProgressUseCase.execute(
      req.user.id,
      dto.lessonId,
      dto.percent,
    );
  }

  /**
   * POST /enrollments/me/quiz — Enviar respuestas de un quiz.
   *
   * El backend evalúa las respuestas, guarda el intento y, si el alumno
   * aprueba, marca la lección como completada automáticamente.
   *
   * Puede devolver 429 (Too Many Requests) si el cooldown de 30 min no ha pasado.
   */
  @Post('me/quiz')
  @UseGuards(EnrollmentGuard)
  @EnrollmentCheck({ lessonIdFrom: 'body', courseIdFrom: 'body' })
  async submitQuiz(@Req() req: any, @Body() dto: SubmitQuizDto) {
    return this.submitQuizUseCase.execute(
      req.user.id,
      dto.lessonId,
      dto.courseId,
      dto.answers,
    );
  }

  /**
   * GET /enrollments/me/quiz/:lessonId/last-attempt — Último intento del
   * alumno en un quiz específico, con cooldown restante si aplica.
   *
   * El frontend lo llama al montar el QuizPlayer para decidir qué mostrar:
   *   - null   → no hay intentos previos, muestra el formulario vacío.
   *   - passed → mantiene la pantalla de resultados APROBADA (permanente).
   *   - !passed + cooldownRemainingMs > 0 → resultados + countdown.
   *   - !passed + cooldownRemainingMs === 0 → resultados + botón reintentar.
   *
   * courseId viene como query param porque el use case lo necesita para
   * el ownership check y para enriquecer hints "Repasa: [lección]".
   */
  @Get('me/quiz/:lessonId/last-attempt')
  @UseGuards(EnrollmentGuard)
  @EnrollmentCheck({ lessonIdFrom: 'params', courseIdFrom: 'query' })
  async getLastQuizAttempt(
    @Req() req: any,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Query('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.getLastQuizAttemptUseCase.execute(
      req.user.id,
      lessonId,
      courseId,
    );
  }

  /**
   * DELETE /enrollments/:enrollmentId — Darse de baja de un curso.
   *
   * Aquí sí aparece un :enrollmentId en la URL → necesitamos el OwnershipGuard.
   * El guard verifica que la matrícula pertenece al usuario del JWT.
   *
   * AuthGuard('jwt') va ANTES de EnrollmentOwnershipGuard porque:
   *   el OwnershipGuard necesita req.user.id, que solo existe
   *   después de que AuthGuard valide el token.
   */
  @Delete(':enrollmentId')
  @UseGuards(EnrollmentOwnershipGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unenroll(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<void> {
    return this.unenrollUseCase.execute(enrollmentId);
  }

  // ── Rutas de administración ───────────────────────────────────────────
  // Protegidas por rol, no por el patrón /me: aquí la admin opera sobre la
  // matrícula de OTRA persona, así que el id sí viaja en la URL.

  /**
   * GET /enrollments/course/:courseId — Alumnas del curso y estado de su acceso.
   */
  @Get('course/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async listCourseStudents(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseStudent[]> {
    return this.listCourseStudentsUseCase.execute(courseId);
  }

  /**
   * PATCH /enrollments/:enrollmentId/expiry — Extender, recortar o volver
   * permanente el acceso de una alumna. `expiresAt: null` = permanente.
   */
  @Patch(':enrollmentId/expiry')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async setExpiry(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: SetEnrollmentExpiryDto,
  ): Promise<{ enrollmentId: string; expiresAt: Date | null }> {
    const enrollment = await this.setEnrollmentExpiryUseCase.execute(
      enrollmentId,
      dto.expiresAt ? new Date(dto.expiresAt) : null,
    );

    return {
      enrollmentId: enrollment.id,
      expiresAt: enrollment.expiresAt,
    };
  }
}
