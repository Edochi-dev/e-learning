import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config'; // Para el .env
import { TypeOrmModule } from '@nestjs/typeorm'; // Para Postgres

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
      synchronize: true, // SOLO PARA DESARROLLO
    }),

    // 3. Archivos estáticos (miniaturas, imágenes, etc.)
    // NOTA: Los videos ya NO se sirven aquí, se sirven por /videos/stream con token firmado
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static',
    }),

    // 4. Módulos de negocio
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