import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoAssets1784200000000 implements MigrationInterface {
  name = 'AddVideoAssets1784200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "video_assets" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"status" character varying NOT NULL DEFAULT 'pending', ` +
        `"sourcePath" character varying NOT NULL, ` +
        `"durationSeconds" integer, ` +
        `"renditions" text, ` +
        `"failureReason" text, ` +
        `"processingStartedAt" TIMESTAMP, ` +
        `"readyAt" TIMESTAMP, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"updatedAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_video_assets" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_video_assets_status" ON "video_assets" ("status")`,
    );
    await queryRunner.query(
      `CREATE TABLE "video_asset_keys" (` +
        `"assetId" uuid NOT NULL, ` +
        `"key" bytea NOT NULL, ` +
        `CONSTRAINT "PK_video_asset_keys" PRIMARY KEY ("assetId"), ` +
        `CONSTRAINT "FK_video_asset_keys_asset" FOREIGN KEY ("assetId") ` +
        `REFERENCES "video_assets"("id") ON DELETE CASCADE)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "video_asset_keys"`);
    await queryRunner.query(`DROP INDEX "IDX_video_assets_status"`);
    await queryRunner.query(`DROP TABLE "video_assets"`);
  }
}
