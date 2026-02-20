import { StreamableFile } from '@nestjs/common';

/**
 * VideoStreamGateway — Gateway Abstracto para Streaming de Video
 *
 * Define QUÉ operaciones de streaming necesitamos, sin decir CÓMO se hacen.
 *
 * Hoy: LocalVideoStreamGateway lee de public/videos/
 * Mañana: S3VideoStreamGateway genera signed URLs de AWS S3
 *
 * Para cambiar de local a nube, solo cambiás 1 línea en videos.module.ts:
 *   useClass: LocalVideoStreamGateway  →  useClass: S3VideoStreamGateway
 */
export abstract class VideoStreamGateway {
    /**
     * Obtiene la información necesaria para hacer streaming de un video.
     *
     * @param videoPath - Ruta relativa del video (ej: "videos/clase1.mp4")
     * @param range - Header Range del request HTTP (ej: "bytes=0-1024") para streaming parcial
     * @returns Objeto con el stream, headers, y status code
     */
    abstract getVideoStream(videoPath: string, range?: string): Promise<{
        stream: StreamableFile;
        headers: Record<string, string | number>;
        statusCode: number;
    }>;

    /**
     * Verifica si un archivo de video existe en el almacenamiento.
     *
     * @param videoPath - Ruta relativa del video
     * @returns true si existe, false si no
     */
    abstract videoExists(videoPath: string): Promise<boolean>;
}
