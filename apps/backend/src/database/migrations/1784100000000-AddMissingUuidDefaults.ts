import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * InitialSchema created these primary keys without a DEFAULT, inside
 * CREATE TABLE IF NOT EXISTS. Databases that predated migrations kept the
 * default from an earlier synchronize; production did not, so inserting a
 * user, course or lesson failed with "null value in column id".
 *
 * Setting a default is idempotent, so this is safe where it already exists.
 */
const TABLES = ['users', 'courses', 'lessons'];

export class AddMissingUuidDefaults1784100000000 implements MigrationInterface {
  name = 'AddMissingUuidDefaults1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" DROP DEFAULT`,
      );
    }
  }
}
