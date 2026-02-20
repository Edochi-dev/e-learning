import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { VideoTokenService } from '../video-token.service';

/**
 * GetSignedUrlUseCase — Genera una URL firmada temporal para un video
 *
 * Flujo:
 * 1. El alumno pide la URL firmada (ya autenticado con JWT)
 * 2. Buscamos la lección en la BD para obtener el videoUrl
 * 3. Generamos un token firmado temporal
 * 4. Retornamos la URL firmada que el frontend usará en el <video src>
 */
@Injectable()
export class GetSignedUrlUseCase {
    constructor(
        private readonly courseGateway: CourseGateway,
        private readonly videoTokenService: VideoTokenService,
    ) { }

    async execute(lessonId: string): Promise<{ url: string; expires: number }> {
        // 1. Buscar la lección
        const lesson = await this.courseGateway.findLesson(lessonId);
        if (!lesson) {
            throw new NotFoundException(`Lección con id "${lessonId}" no encontrada`);
        }

        // 2. Si es un video externo (YouTube, Vimeo), retornar directamente
        if (!lesson.videoUrl.startsWith('/static/')) {
            return { url: lesson.videoUrl, expires: 0 };
        }

        // 3. Extraer la ruta relativa del video
        // "/static/videos/clase1.mp4" → "videos/clase1.mp4"
        const videoPath = lesson.videoUrl.replace('/static/', '');

        // 4. Generar token firmado
        const { token, expires } = this.videoTokenService.generateToken(videoPath);

        // 5. Construir la URL firmada
        const url = `/videos/stream?path=${encodeURIComponent(videoPath)}&token=${token}`;

        return { url, expires };
    }
}
