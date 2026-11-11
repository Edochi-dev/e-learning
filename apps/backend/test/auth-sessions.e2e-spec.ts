import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthSession } from '../src/users/entities/auth-session.entity';

/**
 * Sessions end to end: refresh rotation, copied-token detection and the
 * immediate effect of logout, "log out everywhere" and password changes.
 * Cookies are passed by hand so each test controls exactly which token
 * every request carries.
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

interface Cookies {
  access?: string;
  refresh?: string;
}

function cookiesFrom(res: request.Response): Cookies {
  const raw = (res.headers['set-cookie'] as unknown as string[]) ?? [];
  const value = (name: string) => {
    const cookie = raw.find((c) => c.startsWith(`${name}=`));
    const v = cookie?.split(';')[0].slice(name.length + 1);
    return v ? v : undefined;
  };
  return { access: value('access_token'), refresh: value('refresh_token') };
}

const header = (c: Cookies) =>
  [
    c.access && `access_token=${c.access}`,
    c.refresh && `refresh_token=${c.refresh}`,
  ]
    .filter(Boolean)
    .join('; ');

describe('Sesiones: refresh, revocación y robo de token (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const ana = {
    fullName: 'Ana Sesiones',
    email: 'ana.sessions@test.local',
    password: 'passw0rd123',
  };

  const http = () => request(app.getHttpServer());

  async function login(password = ana.password): Promise<Cookies> {
    const res = await http()
      .post('/users/login')
      .set('User-Agent', 'e2e-browser')
      .send({ email: ana.email, password })
      .expect(200);
    return cookiesFrom(res);
  }

  const me = (c: Cookies) => http().get('/users/me').set('Cookie', header(c));
  const refresh = (c: Cookies) =>
    http().post('/users/refresh').set('Cookie', header(c));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);

    await http().post('/users').send(ana).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('el login entrega access y refresh token en cookies HttpOnly y registra el dispositivo', async () => {
    const res = await http()
      .post('/users/login')
      .set('User-Agent', 'e2e-browser')
      .send({ email: ana.email, password: ana.password })
      .expect(200);

    const raw = res.headers['set-cookie'] as unknown as string[];
    const refreshCookie = raw.find((c) => c.startsWith('refresh_token='))!;
    expect(refreshCookie).toContain('HttpOnly');
    expect(raw.find((c) => c.startsWith('access_token='))).toContain(
      'HttpOnly',
    );

    const { refresh: token } = cookiesFrom(res);
    const stored = await dataSource
      .getRepository(AuthSession)
      .find({ where: { userAgent: 'e2e-browser' } });
    expect(stored.length).toBeGreaterThan(0);
    // Only the hash is stored.
    expect(stored.some((s) => s.refreshTokenHash === token)).toBe(false);
  });

  it('/users/me no filtra el id de sesión ni la contraseña', async () => {
    const res = await me(await login()).expect(200);
    expect(res.body).not.toHaveProperty('sessionId');
    expect(res.body).not.toHaveProperty('password');
  });

  it('refresh sin access token renueva la sesión y rota el refresh token', async () => {
    const first = await login();

    const res = await refresh({ refresh: first.refresh }).expect(204);
    const renewed = cookiesFrom(res);

    expect(renewed.access).toBeDefined();
    expect(renewed.refresh).toBeDefined();
    expect(renewed.refresh).not.toBe(first.refresh);
    await me({ access: renewed.access }).expect(200);
  });

  it('dos pestañas que renuevan a la vez con el mismo token no cierran la sesión', async () => {
    const first = await login();
    const winner = cookiesFrom(await refresh(first).expect(204));

    // The second tab arrives with the token that was just rotated.
    const loser = await refresh(first).expect(204);
    expect(cookiesFrom(loser).refresh).toBeUndefined();
    await me({ access: cookiesFrom(loser).access }).expect(200);

    // And the session survived: the winner's token still works.
    await refresh({ refresh: winner.refresh }).expect(204);
  });

  it('un token copiado reutilizado fuera de la ventana de gracia revoca la sesión para ambos', async () => {
    const victim = await login();
    const renewed = cookiesFrom(await refresh(victim).expect(204));

    // Push the rotation out of the grace window.
    await dataSource
      .getRepository(AuthSession)
      .createQueryBuilder()
      .update()
      .set({ rotatedAt: () => `now() - interval '5 minutes'` })
      .where(
        '"refreshTokenHash" IS NOT NULL AND "previousRefreshTokenHash" IS NOT NULL',
      )
      .andWhere('"userAgent" = :ua', { ua: 'e2e-browser' })
      .execute();

    // Someone replays the old token: 401 and cookies cleared...
    const replay = await refresh(victim).expect(401);
    expect(
      (replay.headers['set-cookie'] as unknown as string[]).some((c) =>
        c.startsWith('refresh_token=;'),
      ),
    ).toBe(true);

    // ...and the legitimate holder is out too: the session is gone.
    await refresh({ refresh: renewed.refresh }).expect(401);
    await me({ access: renewed.access }).expect(401);
  });

  it('el logout invalida el access token al instante, sin esperar a que venza', async () => {
    const session = await login();
    await me(session).expect(200);

    await http()
      .post('/users/logout')
      .set('Cookie', header(session))
      .expect(204);

    await me(session).expect(401);
    await refresh(session).expect(401);
  });

  it('cerrar sesión en todos los dispositivos saca también al actual', async () => {
    const laptop = await login();
    const phone = await login();

    await http()
      .post('/users/me/sessions/revoke-all')
      .set('Cookie', header(phone))
      .expect(204);

    await me(laptop).expect(401);
    await me(phone).expect(401);
    await refresh(laptop).expect(401);
  });

  it('cambiar la contraseña cierra los demás dispositivos pero no el actual', async () => {
    const laptop = await login();
    const phone = await login();

    await http()
      .patch('/users/me/password')
      .set('Cookie', header(phone))
      .send({ currentPassword: ana.password, newPassword: 'nuevaPass456' })
      .expect(204);

    await me(phone).expect(200);
    await me(laptop).expect(401);
    await refresh(laptop).expect(401);

    // Restore for any later test.
    await http()
      .patch('/users/me/password')
      .set('Cookie', header(phone))
      .send({ currentPassword: 'nuevaPass456', newPassword: ana.password })
      .expect(204);
  });

  it('refresh sin cookie responde 401', async () => {
    await http().post('/users/refresh').expect(401);
  });
});
