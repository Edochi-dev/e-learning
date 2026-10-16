import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Course } from '../src/courses/entities/course.entity';
import { Lesson } from '../src/courses/entities/lessons.entity';
import { VideoLesson } from '../src/courses/entities/video-lesson.entity';
import { Enrollment } from '../src/enrollments/entities/enrollment.entity';

/**
 * Progreso de video por segmentos: la unión se hace en PostgreSQL (OR de bits
 * y bit_count), así que solo un test contra la base real la valida.
 */
function configureApp(app: INestApplication): void {
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, i) => from + i);

describe('Progreso de video por segmentos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let agent: request.Agent;
  let courseId: string;
  let lessonId: string;

  // Sufijo propio de este archivo: los specs comparten la base efímera.
  const student = {
    fullName: 'Alumna Segmentos',
    email: 'alumna.segmentos@test.local',
    password: 'passw0rd123',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);

    const course = await dataSource.getRepository(Course).save(
      dataSource.getRepository(Course).create({
        title: 'Curso Segmentos E2E',
        price: 50,
        description: 'Curso sembrado para el test de progreso de video.',
      }),
    );
    courseId = course.id;

    const lesson = new Lesson();
    lesson.title = 'Clase con video';
    lesson.description = 'Lección con video.';
    lesson.type = 'class';
    lesson.order = 0;
    lesson.courseId = course.id;
    const videoData = new VideoLesson();
    videoData.videoUrl = `/static/videos/${course.id}.mp4`;
    videoData.duration = '10:00';
    lesson.videoData = videoData;
    lessonId = (await dataSource.getRepository(Lesson).save(lesson)).id;

    await request(app.getHttpServer()).post('/users').send(student).expect(201);
    const user = await dataSource
      .getRepository(User)
      .findOneByOrFail({ email: student.email });
    await dataSource
      .getRepository(Enrollment)
      .save({ userId: user.id, courseId, expiresAt: null });

    agent = request.agent(app.getHttpServer());
    await agent
      .post('/users/login')
      .send({ email: student.email, password: student.password })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  const send = (segments: number[]) =>
    agent
      .patch('/enrollments/me/watch-progress')
      .send({ lessonId, courseId, segments })
      .expect(200);

  it('acumula sesiones distintas, no cuenta dos veces lo repetido y completa al 95%', async () => {
    // Día 1: ve la primera mitad.
    expect((await send(range(0, 50))).body).toEqual({
      watchedPercent: 50,
      lessonCompleted: false,
    });

    // Vuelve a ver lo mismo: no suma.
    expect((await send(range(0, 50))).body.watchedPercent).toBe(50);

    // Día 2, otro dispositivo: ve hasta el 95% acumulado.
    expect((await send(range(50, 95))).body).toEqual({
      watchedPercent: 95,
      lessonCompleted: true,
    });

    const progress = await agent
      .get(`/enrollments/me/courses/${courseId}/progress`)
      .expect(200);
    expect(progress.body.completedLessonIds).toContain(lessonId);
  });

  it('rechaza el formato viejo de porcentaje: el navegador ya no dicta el %', async () => {
    await agent
      .patch('/enrollments/me/watch-progress')
      .send({ lessonId, courseId, percent: 100 })
      .expect(400);
  });
});
