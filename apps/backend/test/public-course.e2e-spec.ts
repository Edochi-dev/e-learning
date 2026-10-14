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
import { UserRole } from '@maris-nails/shared';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Course } from '../src/courses/entities/course.entity';
import { Lesson } from '../src/courses/entities/lessons.entity';
import { VideoLesson } from '../src/courses/entities/video-lesson.entity';
import { ExamLesson } from '../src/courses/entities/exam-lesson.entity';
import { QuizQuestion } from '../src/courses/entities/quiz-question.entity';
import { QuizOption } from '../src/courses/entities/quiz-option.entity';
import { Enrollment } from '../src/enrollments/entities/enrollment.entity';

/**
 * The public course detail must never hand out exam answers or video URLs
 * (unlisted YouTube links included); the full view is admin-only.
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

describe('Detalle de curso: vista pública vs. admin (e2e)', () => {
  let app: INestApplication;
  let courseId: string;
  let draftId: string;
  let dataSource: DataSource;

  const admin = {
    fullName: 'Admin Curso Publico',
    email: 'admin.publiccourse@test.local',
    password: 'passw0rd123',
  };
  const student = {
    fullName: 'Alumna Curso Publico',
    email: 'alumna.publiccourse@test.local',
    password: 'passw0rd123',
  };
  const SECRET_VIDEO = 'https://youtu.be/AbCdEfGhIjK';

  const http = () => request(app.getHttpServer());

  async function loginAs(creds: { email: string; password: string }) {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/users/login')
      .send({ email: creds.email, password: creds.password })
      .expect(200);
    return agent;
  }

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
        title: 'Curso Público E2E',
        price: 30,
        description: 'Curso con video no listado y examen.',
        publishedAt: new Date(),
      }),
    );
    courseId = course.id;

    const draft = await dataSource.getRepository(Course).save(
      dataSource.getRepository(Course).create({
        title: 'Borrador E2E',
        price: 20,
        description: 'Curso a medio armar.',
      }),
    );
    draftId = draft.id;
    const draftLesson = new Lesson();
    Object.assign(draftLesson, {
      title: 'Primera clase del borrador',
      description: 'd',
      type: 'class',
      order: 0,
      courseId: draftId,
    });
    draftLesson.videoData = Object.assign(new VideoLesson(), {
      videoUrl: '/static/videos/borrador.mp4',
    });
    await dataSource.getRepository(Lesson).save(draftLesson);

    const video = new Lesson();
    Object.assign(video, {
      title: 'Clase no listada',
      description: 'Video pagado en YouTube no listado',
      type: 'class',
      order: 0,
      courseId,
    });
    video.videoData = Object.assign(new VideoLesson(), {
      videoUrl: SECRET_VIDEO,
      duration: '12:00',
    });

    const exam = new Lesson();
    Object.assign(exam, {
      title: 'Examen final',
      description: 'Examen',
      type: 'exam',
      order: 1,
      courseId,
    });
    exam.examData = Object.assign(new ExamLesson(), { passingScore: 1 });
    exam.questions = [
      Object.assign(new QuizQuestion(), {
        text: '¿Cuál es la correcta?',
        order: 0,
        options: [
          Object.assign(new QuizOption(), { text: 'Esta', isCorrect: true }),
          Object.assign(new QuizOption(), { text: 'No', isCorrect: false }),
        ],
      }),
    ];
    await dataSource.getRepository(Lesson).save([video, exam]);

    for (const u of [admin, student]) {
      await http().post('/users').send(u).expect(201);
    }
    await dataSource
      .getRepository(User)
      .update({ email: admin.email }, { role: UserRole.ADMIN });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /courses/:id no expone respuestas, preguntas ni URLs de video', async () => {
    const res = await http().get(`/courses/${courseId}`).expect(200);
    const raw = JSON.stringify(res.body);

    expect(raw).not.toContain('isCorrect');
    expect(raw).not.toContain('questions');
    expect(raw).not.toContain('videoUrl');
    expect(raw).not.toContain('AbCdEfGhIjK');

    const body = res.body as {
      title: string;
      lessons: { type: string; videoData?: { provider: string } }[];
    };
    expect(body.title).toBe('Curso Público E2E');
    expect(body.lessons.map((l) => l.type)).toEqual(['class', 'exam']);
    expect(body.lessons[0].videoData?.provider).toBe('youtube');
  });

  it('GET /courses (catálogo) tampoco expone URLs de video', async () => {
    const res = await http().get('/courses?limit=100').expect(200);
    const raw = JSON.stringify(res.body);

    expect(raw).toContain('Curso Público E2E');
    expect(raw).not.toContain('videoUrl');
    expect(raw).not.toContain('AbCdEfGhIjK');
    expect(raw).not.toContain('isCorrect');
  });

  it('GET /courses/admin (lista completa) es solo para la admin', async () => {
    await http().get('/courses/admin').expect(401);
    await (await loginAs(student)).get('/courses/admin').expect(403);

    const res = await (await loginAs(admin))
      .get('/courses/admin?limit=100')
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(SECRET_VIDEO);
  });

  it('GET /courses/:id/admin exige sesión', async () => {
    await http().get(`/courses/${courseId}/admin`).expect(401);
  });

  it('GET /courses/:id/admin rechaza a una alumna', async () => {
    const agent = await loginAs(student);
    await agent.get(`/courses/${courseId}/admin`).expect(403);
  });

  it('GET /courses/:id/admin devuelve a la admin el curso completo para editarlo', async () => {
    const agent = await loginAs(admin);
    const res = await agent.get(`/courses/${courseId}/admin`).expect(200);

    const body = res.body as {
      lessons: {
        videoData?: { videoUrl: string };
        questions?: { options: { isCorrect: boolean }[] }[];
      }[];
    };
    expect(body.lessons[0].videoData?.videoUrl).toBe(SECRET_VIDEO);
    expect(
      body.lessons[1].questions?.[0].options.map((o) => o.isCorrect),
    ).toEqual(expect.arrayContaining([true, false]));
  });

  describe('borrador / publicado', () => {
    const catalogTitles = async () => {
      const res = await http().get('/courses?limit=100').expect(200);
      return (res.body as { data: { title: string }[] }).data.map(
        (c) => c.title,
      );
    };

    it('un borrador no aparece en el catálogo pero abre por enlace directo', async () => {
      expect(await catalogTitles()).not.toContain('Borrador E2E');
      await http().get(`/courses/${draftId}`).expect(200);
    });

    it('un borrador no se puede comprar aunque se conozca su id', async () => {
      const agent = await loginAs(student);
      await agent.post('/orders/me').send({ courseId: draftId }).expect(404);
    });

    it('solo la admin publica, y al publicar entra al catálogo', async () => {
      await (await loginAs(student))
        .post(`/courses/${draftId}/publish`)
        .expect(403);

      const adminAgent = await loginAs(admin);
      await adminAgent.post(`/courses/${draftId}/publish`).expect(204);
      expect(await catalogTitles()).toContain('Borrador E2E');

      await adminAgent.post(`/courses/${draftId}/unpublish`).expect(204);
      expect(await catalogTitles()).not.toContain('Borrador E2E');
    });

    it('no se puede publicar un curso sin lecciones', async () => {
      const empty = await dataSource
        .getRepository(Course)
        .save(
          dataSource
            .getRepository(Course)
            .create({ title: 'Vacío E2E', price: 1, description: 'd' }),
        );
      await (await loginAs(admin))
        .post(`/courses/${empty.id}/publish`)
        .expect(400);
    });
  });

  describe('borrar un curso con alumnas', () => {
    beforeAll(async () => {
      const user = await dataSource
        .getRepository(User)
        .findOneByOrFail({ email: student.email });
      await dataSource
        .getRepository(Enrollment)
        .save(
          dataSource
            .getRepository(Enrollment)
            .create({ userId: user.id, courseId }),
        );
    });

    it('la API lo rechaza con un mensaje que explica qué hacer', async () => {
      const res = await (await loginAs(admin))
        .delete(`/courses/${courseId}`)
        .expect(409);
      expect((res.body as { message: string }).message).toContain(
        'Despublícalo',
      );
      await http().get(`/courses/${courseId}`).expect(200);
    });

    it('la base de datos también lo impide (RESTRICT), aunque se salte la API', async () => {
      await expect(
        dataSource.getRepository(Course).delete(courseId),
      ).rejects.toThrow(/foreign key/i);
    });
  });
});
