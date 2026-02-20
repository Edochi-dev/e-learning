import { Controller, Get, Param, Query, Headers, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { GetSignedUrlUseCase } from './use-cases/get-signed-url.use-case';
import { StreamVideoUseCase } from './use-cases/stream-video.use-case';

/**
 * VideosController — Endpoints de streaming de video
 *
 * Dos endpoints:
 *
 * 1. GET /videos/:lessonId/signed-url  (protegido con JWT)
 *    → El frontend pide la URL firmada con su token JWT en el header
 *
 * 2. GET /videos/stream?path=...&token=...  (protegido con token firmado)
 *    → El <video src> usa esta URL, no necesita JWT porque el token firmado
 *      ES la autenticación
 */
@Controller('videos')
export class VideosController {
    constructor(
        private readonly getSignedUrlUseCase: GetSignedUrlUseCase,
        private readonly streamVideoUseCase: StreamVideoUseCase,
    ) { }

    /**
     * GET /videos/:lessonId/signed-url
     *
     * Requiere JWT. Retorna una URL firmada temporal.
     * El frontend usa esta URL como src del <video>.
     */
    @Get(':lessonId/signed-url')
    @UseGuards(AuthGuard('jwt'))
    async getSignedUrl(@Param('lessonId') lessonId: string) {
        return this.getSignedUrlUseCase.execute(lessonId);
    }

    /**
     * GET /videos/stream?path=videos/clase1.mp4&token=abc123.1608000000
     *
     * NO requiere JWT — el token firmado en la query string ES la autenticación.
     * Soporta Range Requests para streaming eficiente.
     */
    @Get('stream')
    async streamVideo(
        @Query('path') videoPath: string,
        @Query('token') token: string,
        @Headers('range') range: string | undefined,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.streamVideoUseCase.execute(videoPath, token, range);

        // Seteamos los headers de respuesta
        for (const [key, value] of Object.entries(result.headers)) {
            res.setHeader(key, value);
        }

        // Seteamos el status code (200 o 206 para partial content)
        res.status(result.statusCode);

        return result.stream;
    }
}
