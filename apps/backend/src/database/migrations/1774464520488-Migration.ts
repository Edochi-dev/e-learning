import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774464520488 implements MigrationInterface {
    name = 'Migration1774464520488'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "quiz_options" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "text" character varying NOT NULL, "isCorrect" boolean NOT NULL DEFAULT false, "questionId" uuid, CONSTRAINT "PK_9c59607f100085ab17f0f138926" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_912dd301518a846947070f73a3" ON "quiz_options" ("questionId") `);
        await queryRunner.query(`CREATE TABLE "quiz_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "text" text NOT NULL, "order" integer NOT NULL DEFAULT '0', "relatedLessonId" uuid, "lessonId" uuid, CONSTRAINT "PK_ec0447fd30d9f5c182e7653bfd3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_23eeb4ff025abe472c0934930c" ON "quiz_questions" ("lessonId") `);
        await queryRunner.query(`CREATE TABLE "quiz_attempt_answers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "questionId" uuid NOT NULL, "selectedOptionId" uuid NOT NULL, "correct" boolean NOT NULL, "attemptId" uuid, CONSTRAINT "PK_876afc52bb7dd208ae7ce3ec6ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5fe7118101facbd40e303ffb8a" ON "quiz_attempt_answers" ("attemptId") `);
        await queryRunner.query(`CREATE TABLE "quiz_attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "lessonId" uuid NOT NULL, "score" integer NOT NULL, "passed" boolean NOT NULL, "submittedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "PK_a84a93fb092359516dc5b325b90" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ff7b1d71fabdc7e1f4aff55285" ON "quiz_attempts" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9c7cbe854830dba59f46cebf7c" ON "quiz_attempts" ("lessonId") `);
        await queryRunner.query(`ALTER TABLE "lessons" ADD "type" character varying NOT NULL DEFAULT 'class'`);
        await queryRunner.query(`ALTER TABLE "lessons" ADD "passingScore" integer`);
        await queryRunner.query(`ALTER TABLE "lessons" ALTER COLUMN "videoUrl" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "quiz_options" ADD CONSTRAINT "FK_quiz_option_questionId" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quiz_questions" ADD CONSTRAINT "FK_quiz_question_lessonId" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "FK_quiz_attempt_answer_attemptId" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quiz_attempts" ADD CONSTRAINT "FK_quiz_attempt_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quiz_attempts" ADD CONSTRAINT "FK_quiz_attempt_lessonId" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quiz_attempts" DROP CONSTRAINT "FK_quiz_attempt_lessonId"`);
        await queryRunner.query(`ALTER TABLE "quiz_attempts" DROP CONSTRAINT "FK_quiz_attempt_userId"`);
        await queryRunner.query(`ALTER TABLE "quiz_attempt_answers" DROP CONSTRAINT "FK_quiz_attempt_answer_attemptId"`);
        await queryRunner.query(`ALTER TABLE "quiz_questions" DROP CONSTRAINT "FK_quiz_question_lessonId"`);
        await queryRunner.query(`ALTER TABLE "quiz_options" DROP CONSTRAINT "FK_quiz_option_questionId"`);
        await queryRunner.query(`ALTER TABLE "lessons" ALTER COLUMN "videoUrl" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN "passingScore"`);
        await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN "type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9c7cbe854830dba59f46cebf7c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ff7b1d71fabdc7e1f4aff55285"`);
        await queryRunner.query(`DROP TABLE "quiz_attempts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5fe7118101facbd40e303ffb8a"`);
        await queryRunner.query(`DROP TABLE "quiz_attempt_answers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23eeb4ff025abe472c0934930c"`);
        await queryRunner.query(`DROP TABLE "quiz_questions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_912dd301518a846947070f73a3"`);
        await queryRunner.query(`DROP TABLE "quiz_options"`);
    }

}
