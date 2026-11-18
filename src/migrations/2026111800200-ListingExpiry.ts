import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S4-59 / S4-60: free ads expire after `settings.freeAdValidityDays`
 * (default 30). Ads already live get a full period from the day this ships
 * (PO 2026-11-17, #2), except Trust Badge providers' ads, which never expire
 * (#4).
 */
export class ListingExpiry2026111800200 implements MigrationInterface {
  name = 'ListingExpiry2026111800200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" ADD "expiresAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" ADD "freeAdValidityDays" integer NOT NULL DEFAULT '30'`,
    );
    await queryRunner.query(`
      UPDATE "listings" l
      SET "expiresAt" = now() + interval '30 days'
      FROM "providers" p
      WHERE p."id" = l."providerId"
        AND l."status" = 'ACTIVE'
        AND l."type" = 'FREE'
        AND p."badge" IS DISTINCT FROM 'TRUST'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "settings" DROP COLUMN "freeAdValidityDays"`,
    );
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "expiresAt"`);
  }
}
