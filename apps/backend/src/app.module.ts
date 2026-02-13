import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/videos', // Los videos estarán disponibles en http://localhost:3000/videos/archivo.mp4
    }),
    CoursesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
