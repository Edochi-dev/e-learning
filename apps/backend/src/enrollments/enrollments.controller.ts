import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnrollInCourseUseCase } from './use-cases/enroll-in-course.use-case';
import {
  GetMyEnrollmentsUseCase,
  EnrollmentWithProgress,
} from './use-cases/get-my-enrollments.use-case';
import { MarkLessonCompleteUseCase } from './use-cases/mark-lesson-complete.use-case';
import { UnenrollUseCase } from './use-cases/unenroll.use-case';
import { SaveWatchProgressUseCase } from './use-cases/save-watch-progress.use-case';
import { GetCourseProgressUseCase, CourseProgress } from './use-cases/get-course-progress.use-case';
import { EnrollmentOwnershipGuard } from './guards/enrollment-ownership.guard';
import { EnrollInCourseDto } from './dto/enroll-in-course.dto';
import { MarkLessonCompleteDto } from './dto/mark-lesson-complete.dto';
import { SaveWatchProgressDto } from './dto/save-watch-progress.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { Enrollment } from './entities/enrollment.entity';
import { SubmitQuizUseCase } from './use-cases/submit-quiz.use-case';

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
 *   POST   /enrollments/me             → Matricularse en un curso
 *   GET    /enrollments/me             → Ver mis cursos con progreso
 *   POST   /enrollments/me/progress    → Marcar lección como completada
 *   DELETE /enrollments/:enrollmentId  → Darse de baja (con OwnershipGuard)
 */
@Controller('enrollments')
@UseGuards(AuthGuard('jwt'))
export class EnrollmentsController {
  constructor(
    private readonly enrollInCourseUseCase: EnrollInCourseUseCase,
    private readonly getMyEnrollmentsUseCase: GetMyEnrollmentsUseCase,
    private readonly markLessonCompleteUseCase: MarkLessonCompleteUseCase,
    private readonly unenrollUseCase: UnenrollUseCase,
    private readonly saveWatchProgressUseCase: SaveWatchProgressUseCase,
    private readonly getCourseProgressUseCase: GetCourseProgressUseCase,
    private readonly submitQuizUseCase: SubmitQuizUseCase,
  ) {}

  @Post('me')
  async enroll(
    @Req() req: any,
    @Body() dto: EnrollInCourseDto,
  ): Promise<Enrollment> {
    return this.enrollInCourseUseCase.execute(req.user.id, dto.courseId);
  }

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
