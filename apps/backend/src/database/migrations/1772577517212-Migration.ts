import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772577517212 implements MigrationInterface {
    name = 'Migration1772577517212'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_1a9ff2409a84c76560ae8a9259" ON "lessons" ("courseId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1a9ff2409a84c76560ae8a9259"`);
    }

}
