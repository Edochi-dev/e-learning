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
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { UserRole } from '@maris-nails/shared';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { CertificateTemplate } from '../src/certificates/entities/certificate-template.entity';

/**
 * Printing through the real HTTP stack: blank spare certificates (nothing
 * issued, no numbers spent) and downloading issued ones merged or zipped.
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

// supertest only buffers text-like bodies by default; the response is a stream.
const binaryParser: Parameters<request.Test['parse']>[0] = (res, callback) => {
  const stream = res as unknown as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  stream.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe('Impresión de certificados (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminAgent: request.Agent;
  let studentAgent: request.Agent;
  let templateId: string;

  const admin = {
    fullName: 'Admin En Blanco',
    email: 'admin.blank@test.local',
    password: 'passw0rd123',
  };
  const student = {
    fullName: 'Alumna En Blanco',
    email: 'alumna.blank@test.local',
    password: 'passw0rd123',
  };

  // The template must exist on disk: the use case reads it like production.
  const templateFile = `e2e-blank-${randomUUID()}.pdf`;
  const templateDir = path.join(
    __dirname,
    '..',
    'public',
    'certificates',
    'templates',
  );

  const counts = async () => {
    const [{ certificates }]: { certificates: number }[] =
      await dataSource.query(
        `SELECT COUNT(*)::int AS certificates FROM "certificates"`,
      );
    const [{ sequences }]: { sequences: number }[] = await dataSource.query(
      `SELECT COUNT(*)::int AS sequences FROM "certificate_number_sequences"`,
    );
    return { certificates, sequences };
  };

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

    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    fs.mkdirSync(templateDir, { recursive: true });
    fs.writeFileSync(path.join(templateDir, templateFile), await doc.save());

    const template = await dataSource.getRepository(CertificateTemplate).save({
      name: 'Plantilla En Blanco',
      courseAbbreviation: 'BLANK',
      filePath: `/static/certificates/templates/${templateFile}`,
      pageWidth: 595,
      pageHeight: 842,
    });
    templateId = template.id;

    adminAgent = await loginAs(admin);
    studentAgent = await loginAs(student);
  });

  const generatedFiles: string[] = [];

  afterAll(async () => {
    fs.rmSync(path.join(templateDir, templateFile), { force: true });
    for (const file of generatedFiles) fs.rmSync(file, { force: true });
    await app.close();
  });

  const blank = (agent: request.Agent, id: string, body: object) =>
    agent
      .post(`/admin/certificate-templates/${id}/blank`)
      .send(body)
      .buffer(true)
      .parse(binaryParser);

  it('devuelve un solo PDF con una página por copia', async () => {
    const res = await blank(adminAgent, templateId, {
      certificateDate: '2026-11-07',
      copies: 4,
    }).expect(200);

    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(
      encodeURIComponent('BLANK en blanco 2026-11-07.pdf'),
    );
    const pdf = await PDFDocument.load(res.body as Buffer);
    expect(pdf.getPageCount()).toBe(4);
  });

  it('no emite certificados ni consume números', async () => {
    const before = await counts();

    await blank(adminAgent, templateId, {
      certificateDate: '2026-11-07',
      copies: 3,
    }).expect(200);

    await expect(counts()).resolves.toEqual(before);
  });

  it('una alumna recibe 403', async () => {
    await blank(studentAgent, templateId, {
      certificateDate: '2026-11-07',
      copies: 1,
    }).expect(403);
  });

  it.each([
    [{ certificateDate: '2026-11-07', copies: 0 }],
    [{ certificateDate: '2026-11-07', copies: 51 }],
    [{ certificateDate: '2026-11-07', copies: 2.5 }],
    [{ certificateDate: '07/11/2026', copies: 1 }],
    [{ copies: 1 }],
  ])('rechaza datos inválidos con 400: %j', async (body) => {
    await blank(adminAgent, templateId, body).expect(400);
  });

  it('una plantilla inexistente responde 404', async () => {
    await blank(adminAgent, randomUUID(), {
      certificateDate: '2026-11-07',
      copies: 1,
    }).expect(404);
  });
  describe('POST /admin/certificates/download', () => {
    let ids: string[];

    beforeAll(async () => {
      const res = await adminAgent
        .post('/admin/certificates/batch')
        .send({
          templateId,
          recipients: [{ name: 'Ana Impresa' }, { name: 'Bea Impresa' }],
          certificateDate: '2026-11-07',
        })
        .expect(201);
      ids = (res.body as { id: string }[]).map((c) => c.id);
      generatedFiles.push(
        ...ids.map((id) =>
          path.join(templateDir, '..', 'generated', `${id}.pdf`),
        ),
      );
    });

    const download = (body: object) =>
      adminAgent
        .post('/admin/certificates/download')
        .send(body)
        .buffer(true)
        .parse(binaryParser);

    it('sin layout siguen saliendo separados en un ZIP', async () => {
      const res = await download({ ids }).expect(200);

      expect(res.headers['content-type']).toBe('application/zip');
    });

    it('con layout "merged" sale un PDF con una página por certificado', async () => {
      const res = await download({ ids, layout: 'merged' }).expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      const pdf = await PDFDocument.load(res.body as Buffer);
      expect(pdf.getPageCount()).toBe(2);
    });

    it('rechaza un layout desconocido', async () => {
      await download({ ids, layout: 'stapled' }).expect(400);
    });
  });
});
