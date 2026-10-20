import { MigrationInterface, QueryRunner } from 'typeorm';

const BOUNDS = `'EQ_5', 'EQ_4', 'LT_4', 'EQ_3', 'LT_3', 'EQ_2', 'LT_2', 'EQ_1', 'LT_1', 'ZERO'`;
const TIERS = `'TRUST', 'DILIGENCE', 'UNDER_IMPROVEMENT'`;

/**
 * Sprint 4 badges (BRD 4.3.18): admin thresholds per tier, one summary row per
 * monthly run, the provider's current badge, and two notification types.
 *
 * Names match TypeORM's default naming strategy (generated against a
 * pre-change schema), so synchronized and migrated schemas stay identical.
 */
export class ProviderBadges2026101800000 implements MigrationInterface {
  name = 'ProviderBadges2026101800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."badge_settings_tier_enum" AS ENUM(${TIERS})`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."badge_settings_maxbound_enum" AS ENUM(${BOUNDS})`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."badge_settings_minbound_enum" AS ENUM(${BOUNDS})`,
    );
    await queryRunner.query(`
      CREATE TABLE "badge_settings" (
        "tier" "public"."badge_settings_tier_enum" NOT NULL,
        "maxBound" "public"."badge_settings_maxbound_enum",
        "minBound" "public"."badge_settings_minbound_enum",
        "enabled" boolean NOT NULL DEFAULT false,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fef432eb859917c58b8b7a23198" PRIMARY KEY ("tier")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "badge_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "period" character varying(7) NOT NULL,
        "ranAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "trustCount" integer NOT NULL DEFAULT '0',
        "diligenceCount" integer NOT NULL DEFAULT '0',
        "underImprovementCount" integer NOT NULL DEFAULT '0',
        "changedCount" integer NOT NULL DEFAULT '0',
        "deletedProviders" jsonb NOT NULL DEFAULT '[]',
        "skippedProviders" jsonb NOT NULL DEFAULT '[]',
        CONSTRAINT "UQ_feb79629e2ed6a338f69e626ee4" UNIQUE ("period"),
        CONSTRAINT "PK_2c143a01458b9997646d72ae4e7" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."providers_badge_enum" AS ENUM(${TIERS})`,
    );
    await queryRunner.query(`
      ALTER TABLE "providers"
        ADD "badge" "public"."providers_badge_enum",
        ADD "badgeAssignedAt" TIMESTAMP WITH TIME ZONE,
        ADD "underImprovementSince" TIMESTAMP WITH TIME ZONE
    `);

    // Appending enum values avoids rewriting the notifications table.
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'BADGE_CHANGED' AFTER 'NEW_RATING'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'BADGE_WARNING' AFTER 'BADGE_CHANGED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type" IN ('BADGE_CHANGED', 'BADGE_WARNING')`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('NEW_MESSAGE', 'CONTRACT_CREATED', 'CONTRACT_SIGNED', 'CONTRACT_UPDATE', 'PAYMENT_RECEIVED', 'PAYMENT_COMPLETED', 'LISTING_APPROVED', 'LISTING_REJECTED', 'NEW_RATING', 'COMPLAINT_SUBMITTED', 'COMPLAINT_RESPONSE', 'COMPLAINT_RESOLVED', 'SYSTEM_ANNOUNCEMENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);

    await queryRunner.query(`
      ALTER TABLE "providers"
        DROP COLUMN "underImprovementSince",
        DROP COLUMN "badgeAssignedAt",
        DROP COLUMN "badge"
    `);
    await queryRunner.query(`DROP TYPE "public"."providers_badge_enum"`);
    await queryRunner.query(`DROP TABLE "badge_runs"`);
    await queryRunner.query(`DROP TABLE "badge_settings"`);
    await queryRunner.query(
      `DROP TYPE "public"."badge_settings_minbound_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."badge_settings_maxbound_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."badge_settings_tier_enum"`);
  }
}
