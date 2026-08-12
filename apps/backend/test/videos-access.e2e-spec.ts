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
import { Enrollment } from '../src/enrollments/entities/enrollment.entity';

/**
 * Tests E2E de autorización de acceso a videos.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------
 * Durante una auditoría se encontró que `GET /videos/:lessonId/signed-url`
 * estaba protegido SOLO con AuthGuard('jwt'), sin verificar matrícula. Como
 * `GET /courses/:id` es público y devuelve las lecciones con su id, la cadena
 * de ataque era:
 *
 *   1. Registrarse gratis (el registro es público).
 *   2. Leer los lessonId del catálogo, sin autenticarse siquiera.
 *   3. Pedir la URL firmada de cualquier lección con el JWT propio.
 *   4. Descargarse los cursos completos sin haberlos pagado.
 *
 * Estos tests son la red que impide que esa regresión vuelva a entrar. Un test
 * unitario del use case NO sirve acá: el control vive en un guard del borde
 * HTTP, así que hay que golpear la ruta real por HTTP.
 *
 * Sembramos los datos (curso, lección, matrícula) directamente por el
 * DataSource en vez de usar el API de admin: lo que se está probando es la
 * autorización del video, no la creación de cursos. Menos ruido, menos
 * acoplamiento a DTOs ajenos al test.
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

describe('Autorización de acceso a videos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Emails con sufijo propio de este archivo: los specs E2E comparten la misma
  // base efímera y Jest puede correrlos en paralelo.
  const enrolled = {
    fullName: 'Alumna Matriculada',
    email: 'matriculada.video@test.local',
    password: 'passw0rd123',
  };
  const outsider = {
    fullName: 'Alumna Sin Matricula',
    email: 'sinmatricula.video@test.local',
    password: 'passw0rd123',
  };
  const admin = {
    fullName: 'Admin Video',
    email: 'admin.video@test.local',
    password: 'passw0rd123',
  };

  let lessonId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);

    // ── Sembrar curso + lección con video ──────────────────────────
    const course = await dataSource.getRepository(Course).save(
      dataSource.getRepository(Course).create({
        title: 'Curso Protegido E2E',
        price: 50,
        description: 'Curso usado para probar el control de acceso al video.',
      }),
    );

    // cascade: true en Lesson.videoData hace que se guarde la fila hija
    // en video_lessons automáticamente (Joined Table Inheritance).
    const lesson = new Lesson();
    lesson.title = 'Clase 1 — protegida';
    lesson.description = 'Lección con video para el test de autorización.';
    lesson.type = 'class';
    lesson.order = 0;
    lesson.courseId = course.id;

    const videoData = new VideoLesson();
    // Ruta local (/static/...) para que el use case tome el camino de firmado.
    // El archivo NO necesita existir: firmar no toca el filesystem.
    videoData.videoUrl = '/static/videos/protegido-e2e.mp4';
    videoData.duration = '10:00';
    lesson.videoData = videoData;

    const savedLesson = await dataSource.getRepository(Lesson).save(lesson);
    lessonId = savedLesson.id;

    // ── Crear los tres usuarios vía API (hashea la clave de verdad) ──
    for (const u of [enrolled, outsider, admin]) {
      await request(app.getHttpServer()).post('/users').send(u).expect(201);
    }

    const userRepo = dataSource.getRepository(User);

    // Promover al admin: el registro siempre crea STUDENT por diseño.
    await userRepo.update({ email: admin.email }, { role: UserRole.ADMIN });

    // Matricular SOLO a la alumna matriculada.
    const enrolledUser = await userRepo.findOneByOrFail({
      email: enrolled.email,
    });
    await dataSource.getRepository(Enrollment).save(
      dataSource.getRepository(Enrollment).create({
        userId: enrolledUser.id,
        courseId: course.id,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  /** Loguea y devuelve un agent con la cookie ya puesta. */
  async function loginAs(creds: { email: string; password: string }) {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/users/login')
      .send({ email: creds.email, password: creds.password })
      .expect(200);
    return agent;
  }

  // ──────────────────────────────────────────────────────────────
  // El agujero que cerramos
  // ──────────────────────────────────────────────────────────────

  it('RECHAZA con 403 a una alumna autenticada que NO compró el curso', async () => {
    const agent = await loginAs(outsider);

    // Autenticada (cookie válida) pero sin matrícula → EnrollmentGuard corta.
    await agent.get(`/videos/${lessonId}/signed-url`).expect(403);
  });

  it('sin sesión responde 401, no 403 (primero autenticación, luego autorización)', async () => {
    await request(app.getHttpServer())
      .get(`/videos/${lessonId}/signed-url`)
      .expect(401);
  });

  // ──────────────────────────────────────────────────────────────
  // Que no se haya roto lo que debe seguir funcionando
  // ──────────────────────────────────────────────────────────────

  it('PERMITE a la alumna matriculada y le devuelve una URL firmada', async () => {
    const agent = await loginAs(enrolled);

    const res = await agent.get(`/videos/${lessonId}/signed-url`).expect(200);

    const body = res.body as { url: string; expires: number };
    expect(body.url).toContain('/videos/stream');
    expect(body.url).toContain('token=');
    expect(body.expires).toBeGreaterThan(0);
  });

  it('PERMITE al ADMIN aunque no esté matriculada (administra la plataforma)', async () => {
    const agent = await loginAs(admin);

    // Sin este bypass la profesora perdería la vista previa de sus propias
    // lecciones, que hoy pasa por este mismo endpoint.
    const res = await agent.get(`/videos/${lessonId}/signed-url`).expect(200);

    expect((res.body as { url: string }).url).toContain('/videos/stream');
  });
});
