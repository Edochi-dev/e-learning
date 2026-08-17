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
import { ApiErrorCode } from '@maris-nails/shared';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Course } from '../src/courses/entities/course.entity';
import { Lesson } from '../src/courses/entities/lessons.entity';
import { VideoLesson } from '../src/courses/entities/video-lesson.entity';
import { Enrollment } from '../src/enrollments/entities/enrollment.entity';

/**
 * Tests E2E del acceso temporal a cursos.
 *
 * La expiración se aplica en EnrollmentGuard, en el borde HTTP: un unit test del
 * use case no la alcanza. Aquí se golpean las rutas reales.
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

describe('Acceso temporal a cursos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Sufijo propio de este archivo: los specs comparten la base efímera.
  const student = {
    fullName: 'Alumna Vencimiento',
    email: 'alumna.expiry@test.local',
    password: 'passw0rd123',
  };

  let expiredCourseId: string;
  let expiredLessonId: string;
  let activeCourseId: string;
  let activeLessonId: string;
  let expiredEnrollmentId: string;

  /** Siembra un curso con una lección de video y devuelve ambos ids. */
  async function seedCourseWithVideo(
    title: string,
  ): Promise<{ courseId: string; lessonId: string }> {
    const course = await dataSource.getRepository(Course).save(
      dataSource.getRepository(Course).create({
        title,
        price: 50,
        description: 'Curso sembrado para el test de acceso temporal.',
      }),
    );

    const lesson = new Lesson();
    lesson.title = `${title} — clase 1`;
    lesson.description = 'Lección con video.';
    lesson.type = 'class';
    lesson.order = 0;
    lesson.courseId = course.id;

    const videoData = new VideoLesson();
    // Firmar no toca el filesystem: el archivo no necesita existir.
    videoData.videoUrl = `/static/videos/${course.id}.mp4`;
    videoData.duration = '10:00';
    lesson.videoData = videoData;

    const saved = await dataSource.getRepository(Lesson).save(lesson);
    return { courseId: course.id, lessonId: saved.id };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);

    const expired = await seedCourseWithVideo('Curso Vencido E2E');
    expiredCourseId = expired.courseId;
    expiredLessonId = expired.lessonId;

    const active = await seedCourseWithVideo('Curso Vigente E2E');
    activeCourseId = active.courseId;
    activeLessonId = active.lessonId;

    await request(app.getHttpServer()).post('/users').send(student).expect(201);

    const user = await dataSource
      .getRepository(User)
      .findOneByOrFail({ email: student.email });

    const enrollmentRepo = dataSource.getRepository(Enrollment);

    // Matrícula VENCIDA ayer.
    const expiredEnrollment = await enrollmentRepo.save(
      enrollmentRepo.create({
        userId: user.id,
        courseId: expiredCourseId,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      }),
    );
    expiredEnrollmentId = expiredEnrollment.id;

    // Matrícula PERMANENTE (expiresAt null): el comportamiento de siempre.
    await enrollmentRepo.save(
      enrollmentRepo.create({
        userId: user.id,
        courseId: activeCourseId,
        expiresAt: null,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginAsStudent() {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/users/login')
      .send({ email: student.email, password: student.password })
      .expect(200);
    return agent;
  }

  // ──────────────────────────────────────────────────────────────
  // El acceso vencido se corta en todas las puertas
  // ──────────────────────────────────────────────────────────────

  it('RECHAZA el video de un curso vencido, con el código ENROLLMENT_EXPIRED', async () => {
    const agent = await loginAsStudent();

    const res = await agent
      .get(`/videos/${expiredLessonId}/signed-url`)
      .expect(403);

    // El código permite al frontend ofrecer "renovar" en vez de "comprar".
    expect((res.body as { code: string }).code).toBe(
      ApiErrorCode.ENROLLMENT_EXPIRED,
    );
  });

  it('RECHAZA leer el progreso de un curso vencido', async () => {
    const agent = await loginAsStudent();

    await agent
      .get(`/enrollments/me/courses/${expiredCourseId}/progress`)
      .expect(403);
  });

  it('RECHAZA marcar una lección de un curso vencido', async () => {
    const agent = await loginAsStudent();

    await agent
      .post('/enrollments/me/progress')
      .send({ lessonId: expiredLessonId, courseId: expiredCourseId })
      .expect(403);
  });

  it('RECHAZA guardar progreso de video de un curso vencido', async () => {
    const agent = await loginAsStudent();

    await agent
      .patch('/enrollments/me/watch-progress')
      .send({
        lessonId: expiredLessonId,
        courseId: expiredCourseId,
        percent: 42,
      })
      .expect(403);
  });

  // ──────────────────────────────────────────────────────────────
  // No se rompe lo que debe seguir funcionando
  // ──────────────────────────────────────────────────────────────

  it('PERMITE el curso con matrícula permanente (expiresAt null)', async () => {
    const agent = await loginAsStudent();

    // Retrocompatibilidad: así están TODAS las matrículas anteriores a esta
    // migración. Si esto se rompiera, el despliegue dejaría fuera a las alumnas
    // que ya compraron.
    await agent.get(`/videos/${activeLessonId}/signed-url`).expect(200);
  });

  it('sigue listando el curso vencido en /enrollments/me', async () => {
    const agent = await loginAsStudent();

    const res = await agent.get('/enrollments/me').expect(200);
    const body = res.body as { course: { id: string } }[];

    // Vencer NO es darse de baja: la alumna conserva su progreso y su
    // certificado, y necesita ver el curso para poder renovarlo.
    expect(body.map((e) => e.course.id)).toEqual(
      expect.arrayContaining([expiredCourseId, activeCourseId]),
    );
  });

  // ──────────────────────────────────────────────────────────────
  // Renovación
  // ──────────────────────────────────────────────────────────────

  it('recupera el acceso cuando se extiende el vencimiento', async () => {
    await dataSource
      .getRepository(Enrollment)
      .update(expiredEnrollmentId, {
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

    const agent = await loginAsStudent();
    await agent.get(`/videos/${expiredLessonId}/signed-url`).expect(200);
  });
});
