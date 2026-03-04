import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772656342794 implements MigrationInterface {
    name = 'Migration1772656342794'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "certificate_templates" ADD "fontFamily" character varying NOT NULL DEFAULT 'Helvetica'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "certificate_templates" DROP COLUMN "fontFamily"`);
    }

}
