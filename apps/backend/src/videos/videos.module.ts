import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { GetSignedUrlUseCase } from './use-cases/get-signed-url.use-case';
import { StreamVideoUseCase } from './use-cases/stream-video.use-case';
import { VideoTokenService } from './video-token.service';
import { VideoStreamGateway } from './gateways/video-stream.gateway';
import { LocalVideoStreamGateway } from './local-video-stream.gateway';
import { CourseGateway } from '../courses/gateways/course.gateway';
import { CoursesRepository } from '../courses/courses.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../courses/entities/lessons.entity';

/**
 * VideosModule — Módulo de streaming de video
 *
 * Cablea el gateway abstracto con la implementación local.
 *
 * Para migrar a la nube, solo cambiás esta línea:
 *   useClass: LocalVideoStreamGateway  →  useClass: S3VideoStreamGateway
 *
 * Todo lo demás (controller, use cases, frontend) sigue igual.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Course, Lesson]),
    ],
    controllers: [VideosController],
    providers: [
        GetSignedUrlUseCase,
        StreamVideoUseCase,
        VideoTokenService,
        {
            provide: VideoStreamGateway,
            useClass: LocalVideoStreamGateway, // ← Cambiá esta línea para migrar a nube
        },
        {
            provide: CourseGateway,
            useClass: CoursesRepository,
        },
    ],
})
export class VideosModule { }
