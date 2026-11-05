import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ClickUp 869fp1jmt: browsers registered for FCM push (PushDevice entity).
 * Production doesn't synchronize, so without this every registration failed
 * with `relation "push_devices" does not exist` and no push was sent.
 */
export class PushDevices2026110500100 implements MigrationInterface {
  name = 'PushDevices2026110500100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."push_devices_recipienttype_enum" AS ENUM ('USER', 'PROVIDER', 'ADMIN');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "push_devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" text NOT NULL,
        "recipientId" uuid NOT NULL,
        "recipientType" "public"."push_devices_recipienttype_enum" NOT NULL,
        "language" character varying(2) NOT NULL DEFAULT 'ar',
        "userAgent" character varying(512),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_f847e055cb2f1c758694dd9b480" UNIQUE ("token"),
        CONSTRAINT "PK_46b68decfd1164e1a796f48dc4a" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_72750cf587a5918034acc1cc06" ON "push_devices" ("recipientId", "recipientType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "push_devices"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."push_devices_recipienttype_enum"`,
    );
  }
}
