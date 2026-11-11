import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── IP real del cliente ───────────────────────────────────────────────────
  // ThrottlerGuard limita por `req.ip`. En producción la API corre bajo PM2
  // detrás de nginx en la MISMA máquina, así que sin esto Express ve como
  // origen la IP del proxy —127.0.0.1— para todas las peticiones, y los
  // límites dejan de ser por persona para pasar a ser globales: las 10
  // peticiones por minuto de /users/login se reparten entre TODAS las alumnas,
  // y agotar el cupo de todo el mundo cuesta un script de diez líneas.
  //
  // 'loopback' y no `true`: solo se confía en un proxy que conecte desde la
  // propia máquina. Con `true` se confiaría en el último salto sea quien sea,
  // y cualquiera podría falsificar X-Forwarded-For para saltarse el límite.
  //
  // Verificado el 2026-09-22 por SSH: nginx envía
  // `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
  // (/etc/nginx/sites-available/marisnails). Si eso deja de ser cierto, esto
  // no arregla nada y hay que revisarlo antes que nada.
  app.set('trust proxy', 'loopback');

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
  // ── Validación global de DTOs ─────────────────────────────────────────
  // transform: true  → convierte "49.99" (string de multipart) a número automáticamente.
  // whitelist: true  → ELIMINA silenciosamente cualquier campo que no esté en el DTO.
  // forbidNonWhitelisted: true → además de eliminar, RECHAZA la request con 400 Bad Request.
  //
  // Sin estas dos opciones, un atacante podría enviar campos extra que no están
  // en el DTO pero SÍ existen en la entidad (ej: { "role": "admin" }) y si el
  // use case hace Object.assign(entity, dto), esos campos se asignarían.
  // Esto se llama "mass assignment" y es un ataque OWASP Top 10.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
