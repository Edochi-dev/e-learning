import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772652147495 implements MigrationInterface {
    name = 'Migration1772652147495'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "certificates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "certificateNumber" character varying NOT NULL, "recipientName" character varying NOT NULL, "filePath" character varying NOT NULL, "issuedAt" TIMESTAMP NOT NULL DEFAULT now(), "templateId" uuid, CONSTRAINT "UQ_9742ea65bce69db989c2e676936" UNIQUE ("certificateNumber"), CONSTRAINT "PK_e4c7e31e2144300bea7d89eb165" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "certificate_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "courseAbbreviation" character varying NOT NULL, "filePath" character varying NOT NULL, "pageWidth" double precision NOT NULL, "pageHeight" double precision NOT NULL, "namePositionX" double precision NOT NULL DEFAULT '0', "namePositionY" double precision NOT NULL DEFAULT '0', "nameFontSize" integer NOT NULL DEFAULT '28', "nameColor" character varying NOT NULL DEFAULT '#000000', "qrPositionX" double precision NOT NULL DEFAULT '0', "qrPositionY" double precision NOT NULL DEFAULT '0', "qrSize" double precision NOT NULL DEFAULT '80', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9704620367ce59e9aa60204ed30" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "certificates" ADD CONSTRAINT "FK_03fc255c16c0770ed70a9563aa2" FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "certificates" DROP CONSTRAINT "FK_03fc255c16c0770ed70a9563aa2"`);
        await queryRunner.query(`DROP TABLE "certificate_templates"`);
        await queryRunner.query(`DROP TABLE "certificates"`);
    }

}
