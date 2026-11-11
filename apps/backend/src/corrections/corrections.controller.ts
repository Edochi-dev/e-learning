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
  StreamableFile,
  Header,
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
import { GetCorrectionByIdUseCase } from './use-cases/get-correction-by-id.use-case';
import { GetReviewAudioUseCase } from './use-cases/get-review-audio.use-case';
import { CorrectionReview } from './entities/correction-review.entity';
import { AuthenticatedUser } from '../users/authenticated-user';
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
 *   GET   /corrections/:id               → Detalle de una entrega
 *   PATCH /corrections/:id/review         → Aprobar o rechazar con un audio
 *
 * Alumna dueña o admin:
 *   GET   /corrections/reviews/:reviewId/audio → Audio de una revisión
 *
 * Nota de diseño: las rutas admin van ANTES de las rutas con parámetros
 * dinámicos (como /me/:lessonId) para evitar que NestJS confunda
 * "pending" o "history" con un :lessonId. Orden importa en routing.
 *
 * El upload acepta JPEG, PNG, WebP y HEIC (convertido a JPEG en el use case).
 * Tamaño máximo: 5 MB.
 */
// Two minutes of browser audio is well under 5 MB; the rest is headroom.
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

@Controller('corrections')
@UseGuards(AuthGuard('jwt'))
export class CorrectionsController {
  constructor(
    private readonly submitCorrectionUseCase: SubmitCorrectionUseCase,
    private readonly getMyCorrectionStatusUseCase: GetMyCorrectionStatusUseCase,
    private readonly listPendingCorrectionsUseCase: ListPendingCorrectionsUseCase,
    private readonly listAllCorrectionsUseCase: ListAllCorrectionsUseCase,
    private readonly reviewCorrectionUseCase: ReviewCorrectionUseCase,
    private readonly getCorrectionByIdUseCase: GetCorrectionByIdUseCase,
    private readonly getReviewAudioUseCase: GetReviewAudioUseCase,
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
   * GET /corrections/history — Histórico paginado con filtros opcionales.
   *
   * Solo ADMIN. Query params (todos opcionales):
   *   ?status=approved|rejected
   *   ?courseId=uuid
   *   ?month=1..12&year=2026
   *   ?page=1&limit=20
   *
   * Siempre excluye 'pending' — el histórico es solo de revisiones hechas.
   */
  @Get('history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async listHistory(
    @Query('status') status?: string,
    @Query('courseId') courseId?: string,
    @Query('month') monthStr?: string,
    @Query('year') yearStr?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(limitStr ?? '20', 10) || 20),
    );
    const month = monthStr ? parseInt(monthStr, 10) : undefined;
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    return this.listAllCorrectionsUseCase.execute(
      { status, courseId, month, year },
      page,
      limit,
    );
  }

  /**
   * GET /corrections/:id — Detalle de una entrega.
   *
   * Solo ADMIN. Carga la submission con todas las relaciones:
   * student, lesson (con assignmentData: referenceImageUrl + instructions),
   * y lesson.course. Usado por la página de revisión del frontend.
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssignmentSubmission> {
    return this.getCorrectionByIdUseCase.execute(id);
  }

  /**
   * PATCH /corrections/:id/review — Aprobar o rechazar con una nota de voz.
   * Multipart: `action` + `audio` (lo que grabe el navegador; el servidor lo
   * normaliza). Es una acción de negocio, por eso es un sub-recurso.
   */
  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('audio'))
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewCorrectionDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_AUDIO_BYTES })],
      }),
    )
    audio: Express.Multer.File,
  ): Promise<CorrectionReview> {
    return this.reviewCorrectionUseCase.execute(id, dto.action, audio.buffer);
  }

  /**
   * GET /corrections/reviews/:reviewId/audio — Solo la alumna dueña o un
   * admin; el use case responde 404 a cualquier otra persona.
   */
  @Get('reviews/:reviewId/audio')
  // Personal data: no shared cache (nginx, proxies) may keep a copy.
  @Header('Cache-Control', 'private, no-store')
  async reviewAudio(
    @Req() req: { user: AuthenticatedUser },
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ): Promise<StreamableFile> {
    const audio = await this.getReviewAudioUseCase.execute(reviewId, req.user);
    return new StreamableFile(audio.stream, {
      type: audio.contentType,
      length: audio.size,
      disposition: 'inline',
    });
  }

  // ── Rutas Alumna ──────────────────────────────────────────────────────
  // EnrollmentGuard verifica matrícula ANTES de llegar al use case.
  // El guard lee la metadata de @EnrollmentCheck() para saber dónde
  // encontrar el courseId o cómo resolverlo desde un lessonId.

  @Post('submit')
  @UseGuards(EnrollmentGuard)
  @EnrollmentCheck({ courseIdFrom: 'query' })
  @UseInterceptors(FileInterceptor('photo'))
  async submit(
    @Req() req: { user: { id: string } },
    @Query('courseId', ParseUUIDPipe) courseId: string,
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
      courseId,
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
