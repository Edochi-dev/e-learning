import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774043566376 implements MigrationInterface {
    name = 'Migration1774043566376'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "courseId" uuid NOT NULL, "amount" numeric(10,2) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_userId" ON "orders" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_courseId" ON "orders" ("courseId") `);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_courseId" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_courseId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_courseId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_userId"`);
        await queryRunner.query(`DROP TABLE "orders"`);
    }

}
