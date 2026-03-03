import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Sobreescribe el header Cross-Origin-Resource-Policy en rutas que sirven
 * recursos embebibles (<img>, <video>).
 *
 * Helmet setea 'same-origin' globalmente, lo que bloquea sub-recursos cuando
 * el frontend vive en un origen distinto al backend. Este middleware aplica
 * 'cross-origin' solo donde es necesario, sin relajar el resto del API.
 */
@Injectable()
export class CrossOriginResourcePolicyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }
}
