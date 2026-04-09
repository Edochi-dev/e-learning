import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssignmentLessons1775754021697 implements MigrationInterface {
    name = 'AddAssignmentLessons1775754021697'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video_lessons" DROP CONSTRAINT "FK_video_lessons_lessonId"`);
        await queryRunner.query(`ALTER TABLE "exam_lessons" DROP CONSTRAINT "FK_exam_lessons_lessonId"`);
        await queryRunner.query(`ALTER TABLE "certificates" DROP CONSTRAINT "FK_03fc255c16c0770ed70a9563aa2"`);
        await queryRunner.query(`CREATE TABLE "assignment_lessons" ("lessonId" uuid NOT NULL, "referenceImageUrl" character varying NOT NULL, "instructions" text NOT NULL, CONSTRAINT "PK_19308a7cd07db835088f927e66e" PRIMARY KEY ("lessonId"))`);
        await queryRunner.query(`ALTER TABLE "video_lessons" ADD CONSTRAINT "FK_52c3aab6e39a1a11f35e66b6f32" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exam_lessons" ADD CONSTRAINT "FK_128029250249684ac6f2f764724" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignment_lessons" ADD CONSTRAINT "FK_19308a7cd07db835088f927e66e" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "certificates" ADD CONSTRAINT "FK_03fc255c16c0770ed70a9563aa2" FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "certificates" DROP CONSTRAINT "FK_03fc255c16c0770ed70a9563aa2"`);
        await queryRunner.query(`ALTER TABLE "assignment_lessons" DROP CONSTRAINT "FK_19308a7cd07db835088f927e66e"`);
        await queryRunner.query(`ALTER TABLE "exam_lessons" DROP CONSTRAINT "FK_128029250249684ac6f2f764724"`);
        await queryRunner.query(`ALTER TABLE "video_lessons" DROP CONSTRAINT "FK_52c3aab6e39a1a11f35e66b6f32"`);
        await queryRunner.query(`DROP TABLE "assignment_lessons"`);
        await queryRunner.query(`ALTER TABLE "certificates" ADD CONSTRAINT "FK_03fc255c16c0770ed70a9563aa2" FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exam_lessons" ADD CONSTRAINT "FK_exam_lessons_lessonId" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "video_lessons" ADD CONSTRAINT "FK_video_lessons_lessonId" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
