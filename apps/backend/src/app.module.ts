import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';

import { CoursesModule } from './courses/courses.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { VideosModule } from './videos/videos.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { CertificatesModule } from './certificates/certificates.module';
import { OrdersModule } from './orders/orders.module';
import { BlockVideoStaticMiddleware } from './videos/block-video-static.middleware';
import { CrossOriginResourcePolicyMiddleware } from './common/middleware/cross-origin-resource-policy.middleware';

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
      }),
    }),

    // 2. Conectamos TypeORM a PostgreSQL usando el .env
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      entities: [User],
      synchronize: false,
      migrations: [join(__dirname, 'database/migrations/*.js')],
      migrationsRun: true,
    }),

    // 3. Rate limiting global (aplicado selectivamente en controladores)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

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
    OrdersModule,
    CertificatesModule,
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
        '/videos/stream',
        '/static/certificates/*path',
      );
  }
}
