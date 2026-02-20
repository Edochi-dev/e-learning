import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { VideoStreamGateway } from './gateways/video-stream.gateway';

/**
 * LocalVideoStreamGateway — Implementación local del VideoStreamGateway
 *
 * Lee videos del filesystem (carpeta public/videos/) y los envía como stream.
 * Soporta "Range Requests" para que el navegador pueda saltar a cualquier
 * parte del video sin descargar todo el archivo.
 *
 * Mañana, si migrás a AWS S3, creás "S3VideoStreamGateway" con la misma
 * interfaz y solo cambiás el binding en videos.module.ts.
 */
@Injectable()
export class LocalVideoStreamGateway implements VideoStreamGateway {
    private readonly logger = new Logger(LocalVideoStreamGateway.name);

    /** Directorio donde viven los videos */
    private readonly publicDir = join(__dirname, '..', 'public');

    /** Mapa de extensiones a MIME types de video */
    private readonly MIME_TYPES: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
    };

    async getVideoStream(videoPath: string, range?: string): Promise<{
        stream: StreamableFile;
        headers: Record<string, string | number>;
        statusCode: number;
    }> {
        // Construimos la ruta absoluta al archivo
        const absolutePath = join(this.publicDir, videoPath);

        if (!existsSync(absolutePath)) {
            this.logger.warn(`Video no encontrado: ${absolutePath}`);
            throw new NotFoundException('Video no encontrado');
        }

        const stat = statSync(absolutePath);
        const fileSize = stat.size;
        const ext = extname(absolutePath).toLowerCase();
        const contentType = this.MIME_TYPES[ext] || 'video/mp4';

        // Si el navegador pide un rango específico (Range Request)
        // Esto permite: saltar en el video, buffering eficiente, etc.
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            // Si no hay final, enviamos un chunk de ~1MB
            const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024, fileSize - 1);
            const chunkSize = end - start + 1;

            const stream = createReadStream(absolutePath, { start, end });

            return {
                stream: new StreamableFile(stream),
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': contentType,
                },
                statusCode: 206, // 206 = Partial Content
            };
        }

        // Sin range: enviamos el video completo
        const stream = createReadStream(absolutePath);

        return {
            stream: new StreamableFile(stream),
            headers: {
                'Content-Length': fileSize,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
            },
            statusCode: 200,
        };
    }

    async videoExists(videoPath: string): Promise<boolean> {
        const absolutePath = join(this.publicDir, videoPath);
        return existsSync(absolutePath);
    }
}
