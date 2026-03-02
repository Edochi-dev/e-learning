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

  app.enableCors();
  // transform: true permite que el DTO convierta "49.99" (string de multipart)
  // a número automáticamente, usando @Type(() => Number) en los campos del DTO.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
