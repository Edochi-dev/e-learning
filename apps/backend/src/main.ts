import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Seguridad: cabeceras HTTP ──────────────────────────────────────────────
  // helmet añade automáticamente varias cabeceras de seguridad estándar.
  // Debe ir ANTES de cualquier otra configuración para que se aplique a
  // todas las respuestas, incluyendo los errores del ValidationPipe.
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Solo el origen del frontend puede hacer fetch al API.
  // En producción, FRONTEND_URL debe ser la URL real (ej: https://marisnails.com).
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // transform: true permite que el DTO convierta "49.99" (string de multipart)
  // a número automáticamente, usando @Type(() => Number) en los campos del DTO.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
