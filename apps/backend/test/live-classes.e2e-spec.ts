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

/** "Mis próximas clases": only live classes not yet over, in active enrollments. */

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

const HOUR = 3_600_000;
const fromNow = (hours: number) => new Date(Date.now() + hours * HOUR);

describe('Mis próximas clases en vivo (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const student = {
    fullName: 'Alumna Agenda',
    email: 'alumna.liveclasses@test.local',
    password: 'passw0rd123',
  };

  async function course(title: string): Promise<Course> {
    return dataSource
      .getRepository(Course)
      .save(
        dataSource
          .getRepository(Course)
          .create({
            title,
            price: 1,
            description: 'd',
            publishedAt: new Date(),
          }),
      );
  }

  async function liveLesson(
    courseId: string,
    title: string,
    startsInHours: number,
  ): Promise<void> {
    const lesson = Object.assign(new Lesson(), {
      title,
      description: 'd',
      type: 'class',
      order: 0,
      courseId,
    });
    lesson.videoData = Object.assign(new VideoLesson(), {
      videoUrl: '/static/videos/vivo.mp4',
      isLive: true,
      liveStartsAt: fromNow(startsInHours),
      liveEndsAt: fromNow(startsInHours + 1),
    });
    await dataSource.getRepository(Lesson).save(lesson);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);

    await request(app.getHttpServer()).post('/users').send(student).expect(201);
    const user = await dataSource
      .getRepository(User)
      .findOneByOrFail({ email: student.email });

    const enrolled = await course('Curso Matriculada');
    await liveLesson(enrolled.id, 'Segunda clase', 48);
    await liveLesson(enrolled.id, 'Primera clase', 2);
    await liveLesson(enrolled.id, 'Clase en curso', -0.5);
    await liveLesson(enrolled.id, 'Clase pasada', -5);

    const notEnrolled = await course('Curso Ajeno');
    await liveLesson(notEnrolled.id, 'Clase ajena', 3);

    const expired = await course('Curso Vencido');
    await liveLesson(expired.id, 'Clase de matrícula vencida', 4);

    const enrollments = dataSource.getRepository(Enrollment);
    await enrollments.save([
      enrollments.create({ userId: user.id, courseId: enrolled.id }),
      enrollments.create({
        userId: user.id,
        courseId: expired.id,
        expiresAt: fromNow(-24),
      }),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('exige sesión', async () => {
    await request(app.getHttpServer())
      .get('/enrollments/me/live-classes')
      .expect(401);
  });

  it('lista solo las clases que no terminaron, de matrículas activas, la más próxima primero', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/users/login')
      .send({ email: student.email, password: student.password })
      .expect(200);

    const res = await agent.get('/enrollments/me/live-classes').expect(200);
    const classes = res.body as {
      lessonTitle: string;
      courseTitle: string;
      liveStartsAt: string;
    }[];

    expect(classes.map((c) => c.lessonTitle)).toEqual([
      'Clase en curso',
      'Primera clase',
      'Segunda clase',
    ]);
    expect(classes[0].courseTitle).toBe('Curso Matriculada');
    expect(classes[0].liveStartsAt).toMatch(/Z$/);
  });
});
