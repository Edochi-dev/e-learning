import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { VideoStreamGateway } from '../gateways/video-stream.gateway';
import { VideoTokenService } from '../video-token.service';
import { StreamableFile } from '@nestjs/common';

/**
 * StreamVideoUseCase — Valida el token firmado y hace streaming del video
 *
 * Este use case se encarga del "paso 2" del flujo:
 * - Recibe la URL firmada (con token y path)
 * - Valida que el token sea válido y no haya expirado
 * - Delega el streaming al VideoStreamGateway
 */
@Injectable()
export class StreamVideoUseCase {
    constructor(
        private readonly videoStreamGateway: VideoStreamGateway,
        private readonly videoTokenService: VideoTokenService,
    ) { }

    async execute(videoPath: string, token: string, range?: string): Promise<{
        stream: StreamableFile;
        headers: Record<string, string | number>;
        statusCode: number;
    }> {
        if (!videoPath || !token) {
            throw new BadRequestException('Faltan parámetros: path y token son requeridos');
        }

        // 1. Validar el token firmado
        const isValid = this.videoTokenService.validateToken(token, videoPath);
        if (!isValid) {
            throw new ForbiddenException('Token de video inválido o expirado');
        }

        // 2. Delegar al gateway de streaming
        return this.videoStreamGateway.getVideoStream(videoPath, range);
    }
}
