import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@maris-nails/shared';
import { RolesGuard } from '../common/guards/roles.guard';
import { EnrollmentGuard } from '../common/guards/enrollment.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EnrollmentCheck } from '../common/decorators/enrollment-check.decorator';
import { SubmitCorrectionUseCase } from './use-cases/submit-correction.use-case';
import { GetMyCorrectionStatusUseCase } from './use-cases/get-my-correction-status.use-case';
import { ListPendingCorrectionsUseCase } from './use-cases/list-pending-corrections.use-case';
import { ListAllCorrectionsUseCase } from './use-cases/list-all-corrections.use-case';
import { ReviewCorrectionUseCase } from './use-cases/review-correction.use-case';
import { SubmitCorrectionDto } from './dto/submit-correction.dto';
import { ReviewCorrectionDto } from './dto/review-correction.dto';
import { AssignmentSubmission } from './entities/assignment-submission.entity';

/**
 * CorrectionsController — Endpoints de correcciones.
 *
 * Rutas de alumna (JWT):
 *   POST  /corrections/submit             → Enviar foto de la tarea
 *   GET   /corrections/me/:lessonId       → Ver estado de mi entrega
 *
 * Rutas de admin (JWT + RolesGuard):
 *   GET   /corrections/pending            → Listar entregas pendientes
 *   GET   /corrections/history            → Histórico con filtros
 *   PATCH /corrections/:id/review         → Aprobar o rechazar una entrega
 *
 * Nota de diseño: las rutas admin van ANTES de las rutas con parámetros
 * dinámicos (como /me/:lessonId) para evitar que NestJS confunda
 * "pending" o "history" con un :lessonId. Orden importa en routing.
 *
 * El upload acepta JPEG, PNG, WebP y HEIC (convertido a JPEG en el use case).
 * Tamaño máximo: 5 MB.
 */
@Controller('corrections')
@UseGuards(AuthGuard('jwt'))
export class CorrectionsController {
  constructor(
    private readonly submitCorrectionUseCase: SubmitCorrectionUseCase,
    private readonly getMyCorrectionStatusUseCase: GetMyCorrectionStatusUseCase,
    private readonly listPendingCorrectionsUseCase: ListPendingCorrectionsUseCase,
    private readonly listAllCorrectionsUseCase: ListAllCorrectionsUseCase,
    private readonly reviewCorrectionUseCase: ReviewCorrectionUseCase,
  ) {}

  // ── Rutas Admin ───────────────────────────────────────────────────────
  // Van primero para que NestJS no confunda "pending" con un :param

  /**
   * GET /corrections/pending — Lista entregas pendientes de revisión.
   *
   * Solo ADMIN. Devuelve submissions con status='pending', ordenadas
   * por fecha de envío (más antigua primero — FIFO).
   */
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async listPending(): Promise<AssignmentSubmission[]> {
    return this.listPendingCorrectionsUseCase.execute();
  }

  /**
   * GET /corrections/history — Histórico completo con filtros opcionales.
   *
   * Solo ADMIN. Permite filtrar por:
   *   ?status=approved|rejected|pending
   *   ?lessonId=uuid
   *   ?studentId=uuid
   *
   * Los query params son opcionales — sin filtros devuelve todo.
   */
  @Get('history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async listHistory(
    @Query('status') status?: string,
    @Query('lessonId') lessonId?: string,
    @Query('studentId') studentId?: string,
  ): Promise<AssignmentSubmission[]> {
    return this.listAllCorrectionsUseCase.execute({
      status,
      lessonId,
      studentId,
    });
  }

  /**
   * PATCH /corrections/:id/review — Aprobar o rechazar una entrega.
   *
   * Solo ADMIN. Body: { action: 'approve'|'reject', feedback: string }
   *
   * ¿Por qué PATCH y no PUT?
   *   Porque no estamos reemplazando TODO el recurso — solo actualizamos
   *   el status, feedback y reviewedAt. PATCH = actualización parcial.
   *
   * ¿Por qué /review como sub-recurso y no solo PATCH /:id?
   *   Porque "revisar" es una ACCIÓN de negocio, no un CRUD genérico.
   *   El endpoint comunica intención: no estás editando campos arbitrarios,
   *   estás ejecutando el acto de revisar una entrega.
   */
  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewCorrectionDto,
  ): Promise<AssignmentSubmission> {
    return this.reviewCorrectionUseCase.execute(id, dto.action, dto.feedback);
  }

  // ── Rutas Alumna ──────────────────────────────────────────────────────
  // EnrollmentGuard verifica matrícula ANTES de llegar al use case.
  // El guard lee la metadata de @EnrollmentCheck() para saber dónde
  // encontrar el courseId o cómo resolverlo desde un lessonId.

  @Post('submit')
  @UseGuards(EnrollmentGuard)
  @EnrollmentCheck({ courseIdFrom: 'body' })
  @UseInterceptors(FileInterceptor('photo'))
  async submit(
    @Req() req: { user: { id: string } },
    @Body() dto: SubmitCorrectionDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /image\/(jpeg|png|webp|heic|heif)/,
          }),
        ],
      }),
    )
    photo: Express.Multer.File,
  ): Promise<AssignmentSubmission> {
    return this.submitCorrectionUseCase.execute(
      req.user.id,
      dto.lessonId,
      dto.courseId,
      photo,
    );
  }

  @Get('me/:lessonId')
  @UseGuards(EnrollmentGuard)
  @EnrollmentCheck({ lessonIdFrom: 'params', lessonIdField: 'lessonId' })
  async getMyStatus(
    @Req() req: { user: { id: string } },
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<AssignmentSubmission | null> {
    return this.getMyCorrectionStatusUseCase.execute(req.user.id, lessonId);
  }
}
