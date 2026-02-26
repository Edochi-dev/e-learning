import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772140261227 implements MigrationInterface {
    name = 'Migration1772140261227'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "courses" ADD "thumbnailUrl" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "thumbnailUrl"`);
    }

}
