import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Provides uuid_generate_v4(), the DEFAULT of many primary keys. Its timestamp
 * precedes InitialSchema on purpose: on a fresh database it must run first.
 * Databases that already have the extension are unaffected (IF NOT EXISTS).
 */
export class EnableUuidOssp1739999999999 implements MigrationInterface {
  name = 'EnableUuidOssp1739999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  // Deliberately a no-op: dropping the extension would break every DEFAULT
  // that calls uuid_generate_v4(), and it predates this migration in prod.
  public async down(): Promise<void> {}
}
