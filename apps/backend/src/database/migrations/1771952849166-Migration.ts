import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1771952849166 implements MigrationInterface {
    name = 'Migration1771952849166'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" DROP CONSTRAINT "FK_lessons_courseId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" ADD CONSTRAINT "FK_lessons_courseId" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
