import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Tests E2E de autenticación y controles transversales.
 *
 * ¿Por qué E2E y no más unit tests?
 * Los tests unitarios mockean los gateways y prueban un Use Case aislado. Por
 * diseño NO pueden ver lo que ocurre en el borde HTTP: el ValidationPipe global,
 * los guards (JWT, Roles, Throttler), el ClassSerializerInterceptor y los
 * middleware de Express. Este archivo levanta la app REAL contra una base de
 * datos REAL (pero efímera y aislada) y golpea rutas por HTTP con supertest,
 * exactamente como lo haría el navegador.
 *
 * Replicamos aquí la MISMA configuración global que main.ts, porque esos
 * pipes/middleware son justo lo que queremos verificar.
 */

// Configura la app igual que main.ts. Extraído a una función para que el test
// pruebe la configuración real de producción, no una versión simplificada.
function configureApp(app: INestApplication): void {
  app.use(helmet());
  app.use(cookieParser());
  app.use('/static/videos', (_req: Request, res: Response) => {
    res.status(403).json({
      statusCode: 403,
      message:
        'Acceso directo a videos no permitido. Usa el endpoint /videos/stream con token firmado.',
    });
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}

/** Forma parcial del usuario serializado que devuelve el API. */
type UserBody = {
  id?: string;
  email?: string;
  role?: string;
  password?: string;
};

describe('Auth & cross-cutting concerns (e2e)', () => {
  let app: INestApplication;

  // Credenciales de un alumno que registramos una vez para todo el archivo.
  const student = {
    fullName: 'Ana Prueba',
    email: 'ana.e2e@test.local',
    password: 'passw0rd123',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    // init() conecta TypeORM: con NODE_ENV=test crea un esquema fresco
    // (dropSchema + synchronize) en la base efímera.
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ──────────────────────────────────────────────────────────────
  // Registro + ValidationPipe
  // ──────────────────────────────────────────────────────────────

  it('POST /users registra un alumno y NO devuelve la contraseña', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send(student)
      .expect(201);

    const body = res.body as UserBody;
    expect(body.email).toBe(student.email);
    expect(body.role).toBe('student'); // rol por defecto
    // El ClassSerializerInterceptor debe ocultar el hash de la contraseña.
    expect(body.password).toBeUndefined();
  });

  it('POST /users rechaza contraseña débil con 400 (ValidationPipe)', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ ...student, email: 'weak@test.local', password: 'short' })
      .expect(400);
  });

  it('POST /users rechaza campos no permitidos con 400 (forbidNonWhitelisted)', async () => {
    // Intento de mass assignment: mandar role=admin. El whitelist debe cortarlo.
    await request(app.getHttpServer())
      .post('/users')
      .send({ ...student, email: 'inject@test.local', role: 'admin' })
      .expect(400);
  });

  // ──────────────────────────────────────────────────────────────
  // Login + JWT por cookie HttpOnly
  // ──────────────────────────────────────────────────────────────

  it('POST /users/login autentica y setea la cookie access_token', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: student.email, password: student.password })
      .expect(200);

    const body = res.body as { user: UserBody };
    expect(body.user.email).toBe(student.email);

    // El JWT viaja en una cookie HttpOnly, no en el body.
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('GET /users/me sin cookie responde 401 (JwtAuthGuard)', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('GET /users/me con cookie válida devuelve el usuario', async () => {
    // El agent persiste las cookies entre requests, como haría el navegador.
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/users/login')
      .send({ email: student.email, password: student.password })
      .expect(200);

    const res = await agent.get('/users/me').expect(200);
    expect((res.body as UserBody).email).toBe(student.email);
  });

  // ──────────────────────────────────────────────────────────────
  // RolesGuard
  // ──────────────────────────────────────────────────────────────

  it('GET /users (solo ADMIN) responde 403 para un alumno (RolesGuard)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/users/login')
      .send({ email: student.email, password: student.password })
      .expect(200);

    // Autenticado pero sin rol ADMIN → prohibido.
    await agent.get('/users').expect(403);
  });

  // ──────────────────────────────────────────────────────────────
  // Middleware de Express (fuera del router de Nest)
  // ──────────────────────────────────────────────────────────────

  it('GET /static/videos/* está bloqueado con 403', async () => {
    // Este bloqueo vive a nivel de Express (main.ts), antes del router de Nest.
    // Un unit test jamás lo alcanzaría.
    await request(app.getHttpServer())
      .get('/static/videos/cualquiera.mp4')
      .expect(403);
  });
});
