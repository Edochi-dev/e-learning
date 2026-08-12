import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { GetSignedUrlUseCase } from './use-cases/get-signed-url.use-case';
import { StreamVideoUseCase } from './use-cases/stream-video.use-case';
import { VideoTokenService } from './video-token.service';
import { VideoStreamGateway } from './gateways/video-stream.gateway';
import { LocalVideoStreamGateway } from './local-video-stream.gateway';
import { CoursesModule } from '../courses/courses.module';
import { StorageModule } from '../storage/storage.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { EnrollmentGuard } from '../common/guards/enrollment.guard';

/**
 * VideosModule — Módulo de streaming de video
 *
 * Cablea el gateway abstracto con la implementación local.
 *
 * Para migrar a la nube, solo cambiás esta línea:
 *   useClass: LocalVideoStreamGateway  →  useClass: S3VideoStreamGateway
 *
 * Todo lo demás (controller, use cases, frontend) sigue igual.
 *
 * Importamos CoursesModule (que exporta CourseGateway) en vez de duplicar
 * el binding { provide: CourseGateway, useClass: CoursesRepository } aquí.
 * Duplicar el binding es frágil: si CoursesRepository agrega una dependencia
 * nueva, todos los módulos que lo duplican se rompen (como nos pasó con
 * QuizQuestionRepository). Importar el módulo es la forma correcta en NestJS.
 *
 * EnrollmentsModule se importa por el EnrollmentGuard, que necesita
 * EnrollmentGateway para comprobar que la alumna compró el curso antes de
 * firmarle la URL del video. LessonGateway (para resolver lessonId → courseId)
 * ya viene de CoursesModule.
 */
@Module({
  imports: [CoursesModule, StorageModule, EnrollmentsModule],
  controllers: [VideosController],
  providers: [
    GetSignedUrlUseCase,
    StreamVideoUseCase,
    VideoTokenService,
    EnrollmentGuard,
    {
      provide: VideoStreamGateway,
      useClass: LocalVideoStreamGateway, // ← Cambiá esta línea para migrar a nube
    },
  ],
})
export class VideosModule {}
