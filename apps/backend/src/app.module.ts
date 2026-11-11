import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';

import { CoursesModule } from './courses/courses.module';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { InvitationsModule } from './invitations/invitations.module';
import { CertificatesModule } from './certificates/certificates.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CorrectionsModule } from './corrections/corrections.module';
import { CourseOverviewModule } from './course-overview/course-overview.module';
import { NameChangeRequestsModule } from './name-change-requests/name-change-requests.module';
import { ScheduleModule } from './schedule/schedule.module';
import { PushModule } from './push/push.module';
import { OrdersModule } from './orders/orders.module';
import { VideoAssetsModule } from './video-assets/video-assets.module';
import { LiveClassRemindersModule } from './live-class-reminders/live-class-reminders.module';
import { BlockVideoStaticMiddleware } from './videos/block-video-static.middleware';
import { CrossOriginResourcePolicyMiddleware } from './common/middleware/cross-origin-resource-policy.middleware';
import { buildTypeOrmOptions } from './database/typeorm.config';

@Module({
  imports: [
    // 1. Cargamos las variables de entorno (.env)
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        // Base de datos — todas obligatorias
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().integer().default(5432),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        // Autenticación — obligatoria y con longitud mínima para evitar secrets débiles
        JWT_SECRET: Joi.string().min(32).required(),
        // Servidor — opcional, tiene default
        PORT: Joi.number().integer().default(3000),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
        // Notificaciones SMTP — TODAS opcionales.
        // Si SMTP_HOST está presente, las demás (excepto SMTP_SECURE) se vuelven
        // obligatorias por la regla `.with()` de abajo: queremos fail-fast en boot
        // si alguien configura SMTP a medias en lugar de descubrirlo en el primer email.
        // Si SMTP_HOST NO está presente, los correos se imprimen en consola (ConsoleEmailTransport).
        SMTP_HOST: Joi.string().optional(),
        SMTP_PORT: Joi.number().integer().optional(),
        SMTP_SECURE: Joi.string().valid('true', 'false').optional(),
        SMTP_USER: Joi.string().optional(),
        SMTP_PASS: Joi.string().optional(),
        SMTP_FROM: Joi.string().optional(),
        // Relay de respaldo: se usa solo si el principal (SMTP_*) rechaza el
        // envío. Mismo todo-o-nada, y exige que el principal exista.
        SMTP_FALLBACK_HOST: Joi.string().optional(),
        SMTP_FALLBACK_PORT: Joi.number().integer().optional(),
        SMTP_FALLBACK_SECURE: Joi.string().valid('true', 'false').optional(),
        SMTP_FALLBACK_USER: Joi.string().optional(),
        SMTP_FALLBACK_PASS: Joi.string().optional(),
        SMTP_FALLBACK_FROM: Joi.string().optional(),
        // Web-push (notificaciones de la agenda) — opcionales. Sin ellas, el
        // push queda desactivado (PushService.isConfigured() = false).
        VAPID_PUBLIC_KEY: Joi.string().optional(),
        VAPID_PRIVATE_KEY: Joi.string().optional(),
        VAPID_SUBJECT: Joi.string().optional(),
        // HLS video pipeline — off by default. Turning it on without the
        // nginx secret would sign segment URLs nginx then rejects.
        HLS_ENABLED: Joi.boolean().default(false),
        HLS_MEDIA_SECRET: Joi.string()
          .min(32)
          .when('HLS_ENABLED', { is: true, then: Joi.required() }),
        HLS_MEDIA_BASE_URL: Joi.string().default('/hls-media'),
        HLS_SOURCE_DIR: Joi.string().optional(),
        HLS_MEDIA_DIR: Joi.string().optional(),
        HLS_VIDEO_ENCODER: Joi.string().valid('nvenc', 'x264').default('nvenc'),
        HLS_TOKEN_TTL_MINUTES: Joi.number().integer().min(1).default(30),
        FFMPEG_PATH: Joi.string().default('ffmpeg'),
        FFPROBE_PATH: Joi.string().default('ffprobe'),
        // Correction voice notes. Transcription is off by default: it needs a
        // Python with faster-whisper, which the Joi rule below insists on.
        CORRECTION_AUDIO_DIR: Joi.string().optional(),
        TRANSCRIPTION_ENABLED: Joi.boolean().default(false),
        WHISPER_PYTHON: Joi.string().when('TRANSCRIPTION_ENABLED', {
          is: true,
          then: Joi.required(),
        }),
        WHISPER_MODEL: Joi.string().default('large-v3-turbo'),
        WHISPER_DEVICE: Joi.string().valid('cuda', 'cpu').default('cuda'),
      })
        .with('SMTP_HOST', ['SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'])
        .with('SMTP_FALLBACK_HOST', [
          'SMTP_HOST',
          'SMTP_FALLBACK_PORT',
          'SMTP_FALLBACK_USER',
          'SMTP_FALLBACK_PASS',
          'SMTP_FALLBACK_FROM',
        ]),
    }),

    // 2. Conectamos TypeORM a PostgreSQL.
    // La configuración vive en buildTypeOrmOptions() para poder variar entre
    // producción (migraciones) y test E2E (esquema efímero) con un guardarraíl
    // de seguridad que impide tocar bases que no sean de test.
    TypeOrmModule.forRoot(buildTypeOrmOptions()),

    // 3. Rate limiting global (aplicado selectivamente en controladores)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // Programador de tareas (cron de recordatorios de la agenda).
    NestScheduleModule.forRoot(),

    // 4. Archivos estáticos (miniaturas, imágenes, etc.)
    // NOTA: Los videos ya NO se sirven aquí, se sirven por /videos/stream con token firmado
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static',
    }),

    // 5. Módulos de negocio
    CoursesModule,
    UsersModule,
    VideosModule,
    EnrollmentsModule,
    InvitationsModule,
    OrdersModule,
    CertificatesModule,
    NotificationsModule,
    CorrectionsModule,
    CourseOverviewModule,
    NameChangeRequestsModule,
    ScheduleModule,
    PushModule,
    VideoAssetsModule,
    LiveClassRemindersModule,
  ],
})
export class AppModule implements NestModule {
  /**
   * El middleware se ejecuta ANTES que ServeStaticModule.
   * Así bloqueamos el acceso a videos sin conflicto de headers.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BlockVideoStaticMiddleware)
      .forRoutes('/static/videos/*path')
      .apply(CrossOriginResourcePolicyMiddleware)
      .forRoutes(
        '/static/images/*path',
        '/static/thumbnails/*path',
        '/static/corrections/*path',
        '/videos/stream',
        '/static/certificates/*path',
      );
  }
}
