import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { FixBackfilledCertificateDates1784000000000 } from '../src/database/migrations/1784000000000-FixBackfilledCertificateDates';

/**
 * The correction runs against real Postgres: its whole point is the time zone
 * arithmetic, which only the database can evaluate.
 */
describe('Corrección de fechas rellenadas en UTC (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const migration = new FixBackfilledCertificateDates1784000000000();

  // Prefijo propio de este archivo: los specs comparten la base efímera.
  async function seed(
    number: string,
    issuedAtUtc: string,
    certificateDate: string,
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO "certificates"
        ("id", "certificateNumber", "recipientName", "templateSnapshot", "filePath", "issuedAt", "certificateDate")
       VALUES (uuid_generate_v4(), $1, 'Alumna Zona Horaria', $2, '/static/x.pdf', $3, $4)`,
      [
        number,
        JSON.stringify({
          name: 'Curso',
          courseAbbreviation: 'TZA',
          paperFormat: 'A4',
        }),
        issuedAtUtc,
        certificateDate,
      ],
    );
  }

  async function dates(): Promise<Record<string, string>> {
    const rows: { certificateNumber: string; date: string }[] =
      await dataSource.query(
        `SELECT "certificateNumber", "certificateDate"::text AS date
         FROM "certificates" WHERE "certificateNumber" LIKE 'TZA-%'`,
      );
    return Object.fromEntries(rows.map((r) => [r.certificateNumber, r.date]));
  }

  async function run(direction: 'up' | 'down'): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    try {
      await migration[direction](queryRunner);
    } finally {
      await queryRunner.release();
    }
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    // 20:16 in Santiago (UTC-4 in April), already the 21st in UTC.
    await seed('TZA-00001', '2026-04-21 00:16:50', '2026-04-21');
    // Daytime: UTC and Santiago agree on the day.
    await seed('TZA-00002', '2026-04-21 15:00:00', '2026-04-21');
    // Issued after the deploy, with an explicit date from the application.
    await seed('TZA-00003', '2026-10-09 01:27:48', '2026-10-08');
    // Evening issuance whose date is not the backfilled value.
    await seed('TZA-00004', '2026-04-21 00:30:00', '2026-04-25');
  });

  afterAll(async () => {
    await app.close();
  });

  it('corrige solo el día rellenado en UTC de una emisión nocturna', async () => {
    await run('up');

    await expect(dates()).resolves.toEqual({
      'TZA-00001': '2026-04-20',
      'TZA-00002': '2026-04-21',
      'TZA-00003': '2026-10-08',
      'TZA-00004': '2026-04-25',
    });
  });

  it('es idempotente', async () => {
    await run('up');

    await expect(dates()).resolves.toMatchObject({ 'TZA-00001': '2026-04-20' });
  });

  it('down restaura el valor rellenado original', async () => {
    await run('down');

    await expect(dates()).resolves.toEqual({
      'TZA-00001': '2026-04-21',
      'TZA-00002': '2026-04-21',
      'TZA-00003': '2026-10-08',
      'TZA-00004': '2026-04-25',
    });
  });
});
