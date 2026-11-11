import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CertificateNumberSequenceGateway } from '../src/certificates/gateways/certificate-number-sequence.gateway';
import { AddCertificateNumberSequences1783800000000 } from '../src/database/migrations/1783800000000-AddCertificateNumberSequences';

/**
 * Certificate numbering against real Postgres: the upsert and the migration
 * backfill are SQL that unit tests with mocked gateways cannot reach.
 */
describe('Numeración de certificados (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let sequence: CertificateNumberSequenceGateway;

  // Prefijos propios de este archivo: los specs comparten la base efímera.
  async function insertCertificate(certificateNumber: string): Promise<void> {
    await dataSource.query(
      `INSERT INTO "certificates"
        ("id", "certificateNumber", "recipientName", "templateSnapshot", "filePath", "certificateDate")
       VALUES (uuid_generate_v4(), $1, 'Alumna Numeración', $2, '/static/x.pdf', CURRENT_DATE)`,
      [
        certificateNumber,
        JSON.stringify({
          name: 'Curso',
          courseAbbreviation: 'X',
          paperFormat: 'A4',
        }),
      ],
    );
  }

  async function sequenceRows(): Promise<Record<string, number>> {
    const rows: { abbreviation: string; lastNumber: number }[] =
      await dataSource.query(
        `SELECT "abbreviation", "lastNumber" FROM "certificate_number_sequences"`,
      );
    return Object.fromEntries(rows.map((r) => [r.abbreviation, r.lastNumber]));
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    sequence = app.get(CertificateNumberSequenceGateway);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('migración', () => {
    const migration = new AddCertificateNumberSequences1783800000000();

    it('inicializa cada prefijo con su número MÁS ALTO, no con el conteo', async () => {
      const queryRunner = dataSource.createQueryRunner();
      try {
        await migration.down(queryRunner);

        // Hueco entre 1 y 7: con COUNT el siguiente sería 3 y chocaría.
        await insertCertificate('NUMA-00001');
        await insertCertificate('NUMA-00007');
        await insertCertificate('NUM-B-00003');

        await migration.up(queryRunner);
      } finally {
        await queryRunner.release();
      }

      const rows = await sequenceRows();
      expect(rows['NUMA']).toBe(7);
      expect(rows['NUM-B']).toBe(3);
      await expect(sequence.next('NUMA')).resolves.toBe(8);
    });
  });

  it('empieza en 1 para una abreviatura nueva y avanza de uno en uno', async () => {
    await expect(sequence.next('NUMC')).resolves.toBe(1);
    await expect(sequence.next('NUMC')).resolves.toBe(2);
  });

  it('NO reutiliza el número del último certificado borrado', async () => {
    const last = await sequence.next('NUMD');
    await insertCertificate(`NUMD-${String(last).padStart(5, '0')}`);
    await dataSource.query(
      `DELETE FROM "certificates" WHERE "certificateNumber" LIKE 'NUMD-%'`,
    );

    await expect(sequence.next('NUMD')).resolves.toBe(last + 1);
  });

  it('reservas simultáneas nunca obtienen el mismo número', async () => {
    const numbers = await Promise.all(
      Array.from({ length: 20 }, () => sequence.next('NUME')),
    );

    expect(new Set(numbers).size).toBe(20);
    expect(Math.max(...numbers)).toBe(20);
  });
});
