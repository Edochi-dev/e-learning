import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { VideosModule } from './videos/videos.module';
import { BlockVideoStaticMiddleware } from './videos/block-video-static.middleware';

@Module({
  imports: [
    // 1. Cargamos las variables de entorno (.env)
    ConfigModule.forRoot({
      isGlobal: true,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  /**
   * El middleware se ejecuta ANTES que ServeStaticModule.
   * Así bloqueamos el acceso a videos sin conflicto de headers.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BlockVideoStaticMiddleware)
      .forRoutes('/static/videos/*');
  }
}