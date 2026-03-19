import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Seguridad: cabeceras HTTP ──────────────────────────────────────────────
  // helmet añade automáticamente varias cabeceras de seguridad estándar.
  // Debe ir ANTES de cualquier otra configuración para que se aplique a
  // todas las respuestas, incluyendo los errores del ValidationPipe.
  app.use(helmet());
  app.use(cookieParser());

  // ── Bloqueo de videos estáticos ───────────────────────────────────────────
  // ServeStaticModule usa Express puro y corre ANTES del router de NestJS,
  // por lo que BlockVideoStaticMiddleware (registrado con configure()) no
  // alcanza a interceptar estas peticiones. La única forma de garantizar el
  // bloqueo es registrar el middleware aquí, al nivel de Express, antes de
  // que cualquier módulo pueda servir el archivo.
  app.use('/static/videos', (_req: Request, res: Response) => {
    res.status(403).json({
      statusCode: 403,
      message:
        'Acceso directo a videos no permitido. Usa el endpoint /videos/stream con token firmado.',
    });
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Solo el origen del frontend puede hacer fetch al API.
  // En producción, FRONTEND_URL debe ser la URL real (ej: https://marisnails.com).
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  });
  // transform: true permite que el DTO convierta "49.99" (string de multipart)
  // a número automáticamente, usando @Type(() => Number) en los campos del DTO.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
