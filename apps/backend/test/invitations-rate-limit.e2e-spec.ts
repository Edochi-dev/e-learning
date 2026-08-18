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
import { AppModule } from '../src/app.module';

/**
 * Rate limiting del canje de invitaciones.
 *
 * Vive en su propio archivo, con su propia app y SIN desactivar el
 * ThrottlerGuard, porque invitations.e2e-spec.ts sí lo desactiva para poder
 * probar la lógica sin chocar contra el límite. Sin este test, alguien podría
 * borrar el @Throttle del endpoint y toda la suite seguiría en verde.
 *
 * Cada app de Nest tiene su propio almacenamiento de throttling en memoria, así
 * que este spec no interfiere con los demás aunque Jest los ejecute a la vez.
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

describe('Rate limiting del canje (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * El endpoint admite 5 canjes por minuto y por IP. El sexto debe cortarse.
   *
   * Se usa un token inexistente a propósito: lo que se comprueba es que el
   * guard corta ANTES de llegar al handler. Que las cinco primeras respondan
   * 404 en vez de 429 demuestra justamente eso — el límite todavía no se había
   * alcanzado y la petición llegó a ejecutarse.
   */
  it('corta el sexto intento de canje en un minuto', async () => {
    const token = 'a'.repeat(64);
    const body = {
      fullName: 'Fuerza Bruta',
      email: 'fuerza@test.local',
      password: 'passw0rd123',
    };

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app.getHttpServer())
        .post(`/invitations/${token}/redeem`)
        .send(body);
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 5)).toEqual([404, 404, 404, 404, 404]);
    expect(statuses[5]).toBe(429);
  });
});
