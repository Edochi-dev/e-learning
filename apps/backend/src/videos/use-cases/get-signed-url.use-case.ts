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

        // 2. Normalizar el URL: si tiene host (ej: "http://localhost:3000/static/videos/clase1.mp4")
        //    extraemos solo el pathname ("/static/videos/clase1.mp4") para comparar correctamente.
        //    Esto cubre el caso en que el admin guardó el URL completo en lugar de la ruta relativa.
        let cleanPath: string;
        try {
            cleanPath = new URL(lesson.videoUrl).pathname;
        } catch {
            // Si no es un URL válido con host, ya es una ruta relativa
            cleanPath = lesson.videoUrl;
        }

        // 3. Si no apunta a nuestro directorio estático, es un video externo (YouTube, Vimeo...)
        if (!cleanPath.startsWith('/static/')) {
            return { url: lesson.videoUrl, expires: 0 };
        }

        // 4. Extraer la ruta relativa del video
        // "/static/videos/clase1.mp4" → "videos/clase1.mp4"
        const videoPath = cleanPath.replace('/static/', '');

        // 4. Generar token firmado
        const { token, expires } = this.videoTokenService.generateToken(videoPath);

        // 5. Construir la URL firmada
        const url = `/videos/stream?path=${encodeURIComponent(videoPath)}&token=${token}`;

        return { url, expires };
    }
}
