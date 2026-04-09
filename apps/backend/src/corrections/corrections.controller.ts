import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
import { SubmitCorrectionUseCase } from './use-cases/submit-correction.use-case';
import { GetMyCorrectionStatusUseCase } from './use-cases/get-my-correction-status.use-case';
import { SubmitCorrectionDto } from './dto/submit-correction.dto';
import { AssignmentSubmission } from './entities/assignment-submission.entity';

/**
 * CorrectionsController — Endpoints de correcciones para la alumna.
 *
 * Rutas:
 *   POST /corrections/submit             → Enviar foto de la tarea
 *   GET  /corrections/me/:lessonId       → Ver estado de mi entrega
 *
 * Todas las rutas requieren JWT (alumna autenticada).
 * El userId se extrae del token, no de la URL — patrón /me.
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
  ) {}

  @Post('submit')
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
  async getMyStatus(
    @Req() req: { user: { id: string } },
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<AssignmentSubmission | null> {
    return this.getMyCorrectionStatusUseCase.execute(req.user.id, lessonId);
  }
}
