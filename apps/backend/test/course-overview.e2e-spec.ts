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
import type { CourseOverview } from '@maris-nails/shared';

/**
 * Portada del curso: las consultas por curso (último intento de quiz con
 * DISTINCT ON, estado de las entregas) solo se validan contra la base real.
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

describe('Portada del curso (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let agent: request.Agent;
  let courseId: string;
  const ids: Record<string, string> = {};

  // Sufijo propio de este archivo: los specs comparten la base efímera.
  const student = {
    fullName: 'Alumna Portada',
    email: 'alumna.portada@test.local',
    password: 'passw0rd123',
  };

  async function addLesson(
    key: string,
    type: 'class' | 'exam' | 'correction',
    order: number,
  ) {
    const lesson = new Lesson();
    lesson.title = key;
    lesson.description = key;
    lesson.type = type;
    lesson.order = order;
    lesson.courseId = courseId;
    if (type === 'class') {
      const video = new VideoLesson();
      video.videoUrl = `/static/videos/${key}.mp4`;
      video.duration = '10:00';
      lesson.videoData = video;
    }
    ids[key] = (await dataSource.getRepository(Lesson).save(lesson)).id;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);

    courseId = (
      await dataSource.getRepository(Course).save(
        dataSource.getRepository(Course).create({
          title: 'Curso Portada E2E',
          price: 50,
          description: 'Curso sembrado para el test de la portada.',
        }),
      )
    ).id;
    await addLesson('vista', 'class', 0);
    await addLesson('empezada', 'class', 1);
    await addLesson('quiz', 'exam', 2);
    await addLesson('practica', 'correction', 3);

    await request(app.getHttpServer()).post('/users').send(student).expect(201);
    const user = await dataSource
      .getRepository(User)
      .findOneByOrFail({ email: student.email });
    await dataSource
      .getRepository(Enrollment)
      .save({ userId: user.id, courseId, expiresAt: null });

    // Dos intentos del quiz: cuenta el más reciente (reprobado).
    await dataSource.query(
      `INSERT INTO quiz_attempts ("userId", "lessonId", score, passed, "submittedAt")
       VALUES ($1, $2, 5, true, now() - interval '2 hours'),
              ($1, $2, 1, false, now() - interval '1 hour')`,
      [user.id, ids.quiz],
    );
    await dataSource.query(
      `INSERT INTO assignment_submissions ("studentId", "lessonId", "photoUrl", status)
       VALUES ($1, $2, '/static/corrections/x.jpg', 'rejected')`,
      [user.id, ids.practica],
    );

    agent = request.agent(app.getHttpServer());
    await agent
      .post('/users/login')
      .send({ email: student.email, password: student.password })
      .expect(200);
    const watch = (lessonId: string, segments: number[]) =>
      agent
        .patch('/enrollments/me/watch-progress')
        .send({ lessonId, courseId, segments })
        .expect(200);
    await watch(
      ids.vista,
      Array.from({ length: 100 }, (_, i) => i),
    );
    await watch(ids.empezada, [0, 1, 2]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve el estado de cada lección en orden y por dónde seguir', async () => {
    const res = await agent
      .get(`/enrollments/me/courses/${courseId}/overview`)
      .expect(200);
    const overview = res.body as CourseOverview;

    expect(overview.lessons.map((l) => [l.lessonId, l.status])).toEqual([
      [ids.vista, 'completed'],
      [ids.empezada, 'in_progress'],
      [ids.quiz, 'failed'],
      [ids.practica, 'needs_changes'],
    ]);
    expect(overview).toMatchObject({
      completedLessons: 1,
      totalLessons: 4,
      progressPercent: 25,
      nextLessonId: ids.empezada,
    });
  });

  it('rechaza a quien no está matriculada en el curso', async () => {
    const other = await dataSource.getRepository(Course).save(
      dataSource.getRepository(Course).create({
        title: 'Curso Ajeno E2E',
        price: 50,
        description: 'Sin matrícula.',
      }),
    );
    await agent.get(`/enrollments/me/courses/${other.id}/overview`).expect(403);
  });
});
