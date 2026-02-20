import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

/**
 * BlockVideoStaticMiddleware — Bloquea el acceso directo a videos estáticos
 *
 * Este middleware se ejecuta ANTES que ServeStaticModule.
 * Intercepta las peticiones a /static/videos/* y devuelve 403.
 *
 * Los videos solo se pueden ver a través de /videos/stream con token firmado.
 */
@Injectable()
export class BlockVideoStaticMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        const hasVideoExtension = videoExtensions.some(ext =>
            req.path.toLowerCase().endsWith(ext),
        );

        if (hasVideoExtension) {
            return res.status(403).json({
                statusCode: 403,
                message: 'Acceso directo a videos no permitido. Usa el endpoint /videos/stream con token firmado.',
            });
        }

        next();
    }
}
