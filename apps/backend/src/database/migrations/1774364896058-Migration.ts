import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774364896058 implements MigrationInterface {
    name = 'Migration1774364896058'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lesson_progress" ADD "watchedPercent" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lesson_progress" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "lesson_progress" ADD "completedAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lesson_progress" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "lesson_progress" ADD "completedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "lesson_progress" DROP COLUMN "watchedPercent"`);
    }

}
