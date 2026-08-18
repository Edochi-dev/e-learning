import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { InvitationStatus, UserRole } from '@maris-nails/shared';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Course } from '../src/courses/entities/course.entity';
import { Enrollment } from '../src/enrollments/entities/enrollment.entity';
import { CourseInvitation } from '../src/invitations/entities/course-invitation.entity';

/**
 * Tests E2E de las invitaciones de un solo uso.
 *
 * El valor de este archivo está en el test de canje concurrente: es lo que
 * convierte "un enlace no puede inscribir a varias personas" de intención a
 * hecho verificado. Un unit test con mocks no puede demostrarlo, porque la
 * garantía la da PostgreSQL, no el código.
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

describe('Invitaciones de curso (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const admin = {
    fullName: 'Admin Invitaciones',
    email: 'admin.inv@test.local',
    password: 'passw0rd123',
  };
  const existingStudent = {
    fullName: 'Alumna Con Cuenta',
    email: 'concuenta.inv@test.local',
    password: 'passw0rd123',
  };

  let courseId: string;
  let adminAgent: request.Agent;
  let studentAgent: request.Agent;

  /** Pide al API un lote de invitaciones y devuelve los tokens en claro. */
  async function createInvitations(labels: string[], validityDays?: number) {
    const body: Record<string, unknown> = { labels };
    if (validityDays !== undefined) body.validityDays = validityDays;

    const res = await adminAgent
      .post(`/invitations/course/${courseId}`)
      .send(body)
      .expect(201);

    return res.body as { id: string; token: string; label: string | null }[];
  }

  beforeAll(async () => {
    /*
     * El ThrottlerGuard se desactiva SOLO en este archivo, y conviene entender
     * por qué no es hacer trampa.
     *
     * El canje está limitado a 5 por minuto y por IP, que es correcto para
     * producción. Estos tests hacen más de una docena desde la misma IP en
     * segundos: es el test el que se comporta de forma imposible, no el límite
     * el que está mal. Subirlo para que los tests pasen sería debilitar una
     * protección real por comodidad.
     *
     * Lo que aquí se prueba es la lógica de las invitaciones. Que el rate
     * limiting funciona merece su propio test, con su propia app, en lugar de
     * condicionar a todos los demás.
     */
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);

    const course = await dataSource.getRepository(Course).save(
      dataSource.getRepository(Course).create({
        title: 'Curso Invitaciones E2E',
        price: 80,
        description: 'Curso para probar los enlaces de invitación.',
        accessDurationDays: 30,
      }),
    );
    courseId = course.id;

    for (const u of [admin, existingStudent]) {
      await request(app.getHttpServer()).post('/users').send(u).expect(201);
    }

    await dataSource
      .getRepository(User)
      .update({ email: admin.email }, { role: UserRole.ADMIN });

    // Una sesión por usuario: /users/login tiene rate limiting real.
    adminAgent = request.agent(app.getHttpServer());
    await adminAgent
      .post('/users/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);

    studentAgent = request.agent(app.getHttpServer());
    await studentAgent
      .post('/users/login')
      .send({
        email: existingStudent.email,
        password: existingStudent.password,
      })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  // ──────────────────────────────────────────────────────────────
  // Generación
  // ──────────────────────────────────────────────────────────────

  it('la admin genera un lote y recibe los tokens en claro UNA vez', async () => {
    const invitations = await createInvitations(['María — grupo marzo', '']);

    expect(invitations).toHaveLength(2);
    expect(invitations[0].label).toBe('María — grupo marzo');
    // Etiqueta vacía se guarda como null, no como cadena vacía.
    expect(invitations[1].label).toBeNull();

    for (const invitation of invitations) {
      expect(invitation.token).toMatch(/^[a-f0-9]{64}$/);
    }

    // En la base de datos solo queda el hash: el token en claro no es
    // recuperable ni siquiera desde el panel.
    const stored = await dataSource
      .getRepository(CourseInvitation)
      .findOneByOrFail({ id: invitations[0].id });

    expect(stored.tokenHash).not.toBe(invitations[0].token);
    expect(stored.tokenHash).toHaveLength(64);
  });

  it('una alumna NO puede generar invitaciones', async () => {
    await studentAgent
      .post(`/invitations/course/${courseId}`)
      .send({ labels: ['intento'] })
      .expect(403);
  });

  // ──────────────────────────────────────────────────────────────
  // Vista previa pública
  // ──────────────────────────────────────────────────────────────

  it('abrir el enlace NO lo gasta: se puede consultar varias veces', async () => {
    const [invitation] = await createInvitations(['preview']);
    const server = request(app.getHttpServer());

    for (let i = 0; i < 3; i++) {
      const res = await server
        .get(`/invitations/${invitation.token}`)
        .expect(200);
      expect(res.body.status).toBe(InvitationStatus.VALID);
      expect(res.body.course.title).toBe('Curso Invitaciones E2E');
      expect(res.body.accessDurationDays).toBe(30);
    }

    // Esto es lo que protege del bot de WhatsApp, que visita las URLs
    // compartidas para armar la vista previa del enlace.
    const stored = await dataSource
      .getRepository(CourseInvitation)
      .findOneByOrFail({ id: invitation.id });
    expect(stored.redeemedAt).toBeNull();
  });

  it('un token inexistente responde 404', async () => {
    await request(app.getHttpServer())
      .get('/invitations/' + 'f'.repeat(64))
      .expect(404);
  });

  // ──────────────────────────────────────────────────────────────
  // Canje
  // ──────────────────────────────────────────────────────────────

  it('canjear crea la cuenta, matricula y deja la sesión iniciada', async () => {
    const [invitation] = await createInvitations(['nueva alumna']);
    const agent = request.agent(app.getHttpServer());

    const res = await agent
      .post(`/invitations/${invitation.token}/redeem`)
      .send({
        fullName: 'Alumna Invitada',
        email: 'invitada.inv@test.local',
        password: 'passw0rd123',
      })
      .expect(201);

    expect(res.body.user.email).toBe('invitada.inv@test.local');

    // La cookie del canje vale como sesión: sin volver a escribir la contraseña.
    const me = await agent.get('/users/me').expect(200);
    expect(me.body.email).toBe('invitada.inv@test.local');

    // Y ya tiene el curso, con el vencimiento contado desde el canje.
    const enrollments = await agent.get('/enrollments/me').expect(200);
    const body = enrollments.body as {
      course: { id: string };
      daysRemaining: number | null;
    }[];
    const enrollment = body.find((e) => e.course.id === courseId)!;
    expect(enrollment.daysRemaining).toBe(30);
  });

  it('el mismo enlace ya no sirve una segunda vez', async () => {
    const [invitation] = await createInvitations(['un solo uso']);

    await request(app.getHttpServer())
      .post(`/invitations/${invitation.token}/redeem`)
      .send({
        fullName: 'Primera',
        email: 'primera.inv@test.local',
        password: 'passw0rd123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/invitations/${invitation.token}/redeem`)
      .send({
        fullName: 'Segunda',
        email: 'segunda.inv@test.local',
        password: 'passw0rd123',
      })
      .expect(403);

    // La segunda no dejó cuenta a medias: la transacción revierte todo.
    const leftover = await dataSource
      .getRepository(User)
      .findOneBy({ email: 'segunda.inv@test.local' });
    expect(leftover).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // EL TEST QUE IMPORTA: canje concurrente
  // ──────────────────────────────────────────────────────────────

  /**
   * Cinco personas abren el MISMO enlace a la vez. Es el escenario real: la
   * profesora pega un enlace en un grupo de WhatsApp por error, o alguien lo
   * reenvía.
   *
   * Comprobar "¿está usada?" y luego escribir dejaría una ventana entre ambas
   * cosas en la que las cinco se creerían ganadoras. La condición viaja dentro
   * del UPDATE, así que el árbitro es PostgreSQL: exactamente una fila
   * actualizada.
   */
  it('con cinco canjes simultáneos entra exactamente UNA persona', async () => {
    const [invitation] = await createInvitations(['carrera']);

    const attempts = Array.from({ length: 5 }, (_, i) =>
      request(app.getHttpServer())
        .post(`/invitations/${invitation.token}/redeem`)
        .send({
          fullName: `Concurrente ${i}`,
          email: `concurrente${i}.inv@test.local`,
          password: 'passw0rd123',
        }),
    );

    const results = await Promise.all(attempts);
    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status !== 201);

    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(4);

    // Y en la base de datos: una sola matrícula y ninguna cuenta huérfana.
    const enrollments = await dataSource
      .getRepository(Enrollment)
      .find({ where: { courseId } });
    const concurrentUsers = await dataSource
      .getRepository(User)
      .createQueryBuilder('u')
      .where('u.email LIKE :pattern', { pattern: 'concurrente%' })
      .getMany();

    expect(concurrentUsers).toHaveLength(1);
    expect(
      enrollments.filter((e) => e.userId === concurrentUsers[0].id),
    ).toHaveLength(1);
  });

  // ──────────────────────────────────────────────────────────────
  // Alumna con cuenta previa
  // ──────────────────────────────────────────────────────────────

  it('quien ya tiene cuenta usa claim y no crea una segunda', async () => {
    const [invitation] = await createInvitations(['ya registrada']);

    const res = await studentAgent
      .post(`/invitations/${invitation.token}/claim`)
      .expect(201);

    expect(res.body.courseId).toBe(courseId);

    const enrollments = await studentAgent.get('/enrollments/me').expect(200);
    const ids = (enrollments.body as { course: { id: string } }[]).map(
      (e) => e.course.id,
    );
    expect(ids).toContain(courseId);
  });

  it('canjear con un email ya registrado avisa en vez de duplicar la cuenta', async () => {
    const [invitation] = await createInvitations(['email repetido']);

    await request(app.getHttpServer())
      .post(`/invitations/${invitation.token}/redeem`)
      .send({
        fullName: 'Otra Vez',
        email: existingStudent.email,
        password: 'passw0rd123',
      })
      .expect(409);

    // El enlace NO se gastó: la alumna todavía puede usarlo iniciando sesión.
    const stored = await dataSource
      .getRepository(CourseInvitation)
      .findOneByOrFail({ id: invitation.id });
    expect(stored.redeemedAt).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // Caducidad y revocación
  // ──────────────────────────────────────────────────────────────

  it('un enlace caducado no se puede canjear', async () => {
    const [invitation] = await createInvitations(['caducado']);

    await dataSource
      .getRepository(CourseInvitation)
      .update(invitation.id, { expiresAt: new Date(Date.now() - 60_000) });

    const preview = await request(app.getHttpServer())
      .get(`/invitations/${invitation.token}`)
      .expect(200);
    expect(preview.body.status).toBe(InvitationStatus.EXPIRED);

    await request(app.getHttpServer())
      .post(`/invitations/${invitation.token}/redeem`)
      .send({
        fullName: 'Tarde',
        email: 'tarde.inv@test.local',
        password: 'passw0rd123',
      })
      .expect(403);
  });

  it('la admin revoca un enlace y deja de servir', async () => {
    const [invitation] = await createInvitations(['revocado']);

    await adminAgent.delete(`/invitations/${invitation.id}`).expect(204);

    const preview = await request(app.getHttpServer())
      .get(`/invitations/${invitation.token}`)
      .expect(200);
    expect(preview.body.status).toBe(InvitationStatus.REVOKED);

    await request(app.getHttpServer())
      .post(`/invitations/${invitation.token}/redeem`)
      .send({
        fullName: 'Revocada',
        email: 'revocada.inv@test.local',
        password: 'passw0rd123',
      })
      .expect(403);
  });

  it('no deja revocar una invitación ya canjeada', async () => {
    const [invitation] = await createInvitations(['ya usada']);

    await request(app.getHttpServer())
      .post(`/invitations/${invitation.token}/redeem`)
      .send({
        fullName: 'Usuaria',
        email: 'usuaria.inv@test.local',
        password: 'passw0rd123',
      })
      .expect(201);

    // Revocar no retira un acceso ya concedido: dar a entender que sí sería
    // peor que negarse.
    await adminAgent.delete(`/invitations/${invitation.id}`).expect(409);
  });

  // ──────────────────────────────────────────────────────────────
  // Los dos relojes
  // ──────────────────────────────────────────────────────────────

  /**
   * La vigencia del ENLACE y la duración del ACCESO son independientes. Quien
   * canjea el último día de un enlace de 7 días recibe igualmente los 30 días
   * de curso: si se confundieran, recibiría lo que quedara del enlace.
   */
  it('la vigencia del enlace no recorta la duración del acceso', async () => {
    const [invitation] = await createInvitations(['reloj'], 7);
    const agent = request.agent(app.getHttpServer());

    await agent
      .post(`/invitations/${invitation.token}/redeem`)
      .send({
        fullName: 'Relojera',
        email: 'reloj.inv@test.local',
        password: 'passw0rd123',
      })
      .expect(201);

    const enrollments = await agent.get('/enrollments/me').expect(200);
    const body = enrollments.body as {
      course: { id: string };
      daysRemaining: number | null;
    }[];

    expect(body.find((e) => e.course.id === courseId)!.daysRemaining).toBe(30);
  });
});
