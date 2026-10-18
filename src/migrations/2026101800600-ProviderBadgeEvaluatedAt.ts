import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S4-54: record which providers a monthly badge run has evaluated, so
 * providers not yet evaluated can show "Newly Added".
 *
 * Backfill: a provider with a badge date was evaluated then; any other
 * provider created before the latest run is treated as evaluated by it.
 */
export class ProviderBadgeEvaluatedAt2026101800600 implements MigrationInterface {
  name = 'ProviderBadgeEvaluatedAt2026101800600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "providers" ADD "badgeEvaluatedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "providers" SET "badgeEvaluatedAt" = "badgeAssignedAt" WHERE "badgeAssignedAt" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "providers" p SET "badgeEvaluatedAt" = r."ranAt"
       FROM (SELECT MAX("ranAt") AS "ranAt" FROM "badge_runs") r
       WHERE p."badgeEvaluatedAt" IS NULL
         AND r."ranAt" IS NOT NULL
         AND p."createdAt" < r."ranAt"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "providers" DROP COLUMN "badgeEvaluatedAt"`,
    );
  }
}
