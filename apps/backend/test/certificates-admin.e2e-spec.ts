import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { UserRole } from '@maris-nails/shared';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';

/**
 * Admin certificate search and batch deletion through the real HTTP stack:
 * query DTO validation, role guard and the jsonb/date SQL filters.
 */

function configureApp(app: INestApplication): void {
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

interface CertificateRow {
  id: string;
  certificateNumber: string;
}

describe('Búsqueda y borrado de certificados (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminAgent: request.Agent;
  let studentAgent: request.Agent;
  let studentId: string;

  // Prefijos propios de este archivo: los specs comparten la base efímera.
  const admin = {
    fullName: 'Admin Certificados',
    email: 'admin.certsearch@test.local',
    password: 'passw0rd123',
  };
  const student = {
    fullName: 'Alumna Certificados',
    email: 'alumna.certsearch@test.local',
    password: 'passw0rd123',
  };

  async function seedCertificate(data: {
    number: string;
    name: string;
    abbreviation: string;
    course: string;
    date: string;
    userId?: string;
  }): Promise<string> {
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO "certificates"
        ("id", "certificateNumber", "recipientName", "templateSnapshot", "filePath", "certificateDate", "userId")
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)
       RETURNING "id"`,
      [
        data.number,
        data.name,
        JSON.stringify({
          name: data.course,
          courseAbbreviation: data.abbreviation,
          paperFormat: 'A4',
        }),
        // Missing on disk on purpose: the file delete is best-effort.
        `/static/certificates/generated/${data.number}.pdf`,
        data.date,
        data.userId ?? null,
      ],
    );
    return rows[0].id;
  }

  async function search(query: Record<string, string>): Promise<string[]> {
    const res = await adminAgent
      .get('/admin/certificates')
      .query(query)
      .expect(200);
    return (res.body as CertificateRow[])
      .map((c) => c.certificateNumber)
      .filter((n) => n.startsWith('SRCH'))
      .sort();
  }

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

    for (const u of [admin, student]) {
      await request(app.getHttpServer()).post('/users').send(u).expect(201);
    }
    await dataSource
      .getRepository(User)
      .update({ email: admin.email }, { role: UserRole.ADMIN });
    studentId = (
      await dataSource
        .getRepository(User)
        .findOneByOrFail({ email: student.email })
    ).id;

    await seedCertificate({
      number: 'SRCHA-00001',
      name: 'Ana Pérez',
      abbreviation: 'SRCHA',
      course: 'Curso A',
      date: '2026-01-15',
      userId: studentId,
    });
    await seedCertificate({
      number: 'SRCHA-00002',
      name: 'Beatriz Gómez',
      abbreviation: 'SRCHA',
      course: 'Curso A',
      date: '2026-03-01',
    });
    await seedCertificate({
      number: 'SRCHB-00001',
      name: 'Ana López',
      abbreviation: 'SRCHB',
      course: 'Curso B',
      date: '2026-03-31',
    });

    adminAgent = await loginAs(admin);
    studentAgent = await loginAs(student);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /admin/certificates', () => {
    it('filtra por texto en el nombre', async () => {
      await expect(search({ search: 'ana' })).resolves.toEqual([
        'SRCHA-00001',
        'SRCHB-00001',
      ]);
    });

    it('filtra por la abreviatura congelada en el certificado', async () => {
      await expect(search({ course: 'SRCHA' })).resolves.toEqual([
        'SRCHA-00001',
        'SRCHA-00002',
      ]);
    });

    it('el rango de fechas incluye ambos extremos', async () => {
      await expect(
        search({ from: '2026-03-01', to: '2026-03-31' }),
      ).resolves.toEqual(['SRCHA-00002', 'SRCHB-00001']);
    });

    it('distingue certificados ligados a una cuenta de los que no', async () => {
      await expect(search({ account: 'linked' })).resolves.toEqual([
        'SRCHA-00001',
      ]);
      await expect(search({ account: 'unlinked' })).resolves.toEqual([
        'SRCHA-00002',
        'SRCHB-00001',
      ]);
    });

    it('combina filtros con AND', async () => {
      await expect(
        search({ search: 'ana', course: 'SRCHB', to: '2026-12-31' }),
      ).resolves.toEqual(['SRCHB-00001']);
    });

    it('rechaza fechas mal formadas y rangos invertidos', async () => {
      await adminAgent
        .get('/admin/certificates')
        .query({ from: '01/03/2026' })
        .expect(400);
      await adminAgent
        .get('/admin/certificates')
        .query({ from: '2026-04-01', to: '2026-03-01' })
        .expect(400);
    });

    it('rechaza a quien no es admin', async () => {
      await studentAgent.get('/admin/certificates').expect(403);
    });
  });

  it('GET /admin/certificates/courses lista cada curso una vez', async () => {
    const res = await adminAgent.get('/admin/certificates/courses').expect(200);
    const courses = (
      res.body as { abbreviation: string; name: string }[]
    ).filter((c) => c.abbreviation.startsWith('SRCH'));

    expect(courses).toEqual([
      { abbreviation: 'SRCHA', name: 'Curso A' },
      { abbreviation: 'SRCHB', name: 'Curso B' },
    ]);
  });

  describe('POST /admin/certificates/delete', () => {
    it('no borra nada si algún id no existe', async () => {
      const id = await seedCertificate({
        number: 'DELX-00001',
        name: 'Prueba Intacta',
        abbreviation: 'DELX',
        course: 'Curso X',
        date: '2026-02-01',
      });

      await adminAgent
        .post('/admin/certificates/delete')
        .send({ ids: [id, '9b2f6a3e-1c4d-4e8f-a7b6-0d5c3e2f1a90'] })
        .expect(404);

      const remaining: unknown[] = await dataSource.query(
        `SELECT 1 FROM "certificates" WHERE "id" = $1`,
        [id],
      );
      expect(remaining).toHaveLength(1);
    });

    it('borra todos los seleccionados aunque su PDF no exista en disco', async () => {
      const ids = [
        await seedCertificate({
          number: 'DELY-00001',
          name: 'Prueba Uno',
          abbreviation: 'DELY',
          course: 'Curso Y',
          date: '2026-02-01',
        }),
        await seedCertificate({
          number: 'DELY-00002',
          name: 'Prueba Dos',
          abbreviation: 'DELY',
          course: 'Curso Y',
          date: '2026-02-01',
        }),
      ];

      await adminAgent
        .post('/admin/certificates/delete')
        .send({ ids })
        .expect(204);

      const remaining: unknown[] = await dataSource.query(
        `SELECT 1 FROM "certificates" WHERE "id" = ANY($1)`,
        [ids],
      );
      expect(remaining).toHaveLength(0);
    });

    it('valida el cuerpo y exige rol admin', async () => {
      await adminAgent
        .post('/admin/certificates/delete')
        .send({ ids: [] })
        .expect(400);
      await adminAgent
        .post('/admin/certificates/delete')
        .send({ ids: ['no-es-un-uuid'] })
        .expect(400);
      await studentAgent
        .post('/admin/certificates/delete')
        .send({ ids: ['9b2f6a3e-1c4d-4e8f-a7b6-0d5c3e2f1a90'] })
        .expect(403);
    });
  });
});
