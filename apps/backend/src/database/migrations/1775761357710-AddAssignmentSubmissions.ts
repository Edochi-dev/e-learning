import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssignmentSubmissions1775761357710 implements MigrationInterface {
    name = 'AddAssignmentSubmissions1775761357710'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "assignment_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "studentId" uuid NOT NULL, "lessonId" uuid NOT NULL, "photoUrl" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "feedback" text, "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), "reviewedAt" TIMESTAMP, CONSTRAINT "UQ_3d6473172cea6fc8d2ea3eb2a0a" UNIQUE ("studentId", "lessonId"), CONSTRAINT "PK_0caedc49d0357bedac05ca5a806" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "assignment_submissions" ADD CONSTRAINT "FK_dfb5017c979e0e8e47659b0da24" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignment_submissions" ADD CONSTRAINT "FK_677ec083d1cf75d8dcc14d62854" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assignment_submissions" DROP CONSTRAINT "FK_677ec083d1cf75d8dcc14d62854"`);
        await queryRunner.query(`ALTER TABLE "assignment_submissions" DROP CONSTRAINT "FK_dfb5017c979e0e8e47659b0da24"`);
        await queryRunner.query(`DROP TABLE "assignment_submissions"`);
    }

}
