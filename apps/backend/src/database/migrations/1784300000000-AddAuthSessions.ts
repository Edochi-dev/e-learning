import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSessions1784300000000 implements MigrationInterface {
  name = 'AddAuthSessions1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auth_sessions" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"userId" uuid NOT NULL, ` +
        `"refreshTokenHash" character varying NOT NULL, ` +
        `"previousRefreshTokenHash" character varying, ` +
        `"rotatedAt" TIMESTAMP WITH TIME ZONE, ` +
        `"expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"revokedAt" TIMESTAMP WITH TIME ZONE, ` +
        `"lastUsedAt" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"userAgent" character varying(255), ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_auth_sessions" PRIMARY KEY ("id"), ` +
        `CONSTRAINT "FK_auth_sessions_user" FOREIGN KEY ("userId") ` +
        `REFERENCES "users"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_sessions_userId" ON "auth_sessions" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_auth_sessions_refreshTokenHash" ON "auth_sessions" ("refreshTokenHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_sessions_previousRefreshTokenHash" ON "auth_sessions" ("previousRefreshTokenHash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
  }
}
