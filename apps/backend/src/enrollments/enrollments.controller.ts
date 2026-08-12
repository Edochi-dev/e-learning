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
import { MarkLessonCompleteDto } from './dto/mark-lesson-complete.dto';
import { SaveWatchProgressDto } from './dto/save-watch-progress.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { SubmitQuizUseCase } from './use-cases/submit-quiz.use-case';
import { GetLastQuizAttemptUseCase } from './use-cases/get-last-quiz-attempt.use-case';

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
  ) {}

  // No hay endpoint de auto-matrícula: sería acceso gratis a cualquier curso.
  // Solo otorgan acceso una orden con pago CONFIRMADO o una invitación de la
  // admin. Si hiciera falta matricular a mano, va bajo /admin con @Roles(ADMIN).

  @Get('me')
  async getMyEnrollments(@Req() req: any): Promise<EnrollmentWithProgress[]> {
    return this.getMyEnrollmentsUseCase.execute(req.user.id);
  }

  @Post('me/progress')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markLessonComplete(
    @Req() req: any,
    @Body() dto: MarkLessonCompleteDto,
  ): Promise<void> {
    return this.markLessonCompleteUseCase.execute(
      req.user.id,
      dto.lessonId,
      dto.courseId,
    );
  }

  /**
   * GET /enrollments/me/courses/:courseId/progress
   * Devuelve en una sola llamada las lecciones completadas Y el porcentaje visto
   * por lección. El frontend lo usa al montar la página de estudio.
   */
  @Get('me/courses/:courseId/progress')
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveWatchProgress(
    @Req() req: any,
    @Body() dto: SaveWatchProgressDto,
  ): Promise<void> {
    return this.saveWatchProgressUseCase.execute(
      req.user.id,
      dto.lessonId,
      dto.courseId,
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
}
