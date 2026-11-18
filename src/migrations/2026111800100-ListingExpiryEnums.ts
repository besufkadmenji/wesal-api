import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S4-59: free ads expire. Adds the EXPIRED listing status and the
 * LISTING_EXPIRED notification type. Kept apart from ListingExpiry because
 * Postgres can't use a new enum value in the transaction that added it.
 */
export class ListingExpiryEnums2026111800100 implements MigrationInterface {
  name = 'ListingExpiryEnums2026111800100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."listings_status_enum" ADD VALUE IF NOT EXISTS 'EXPIRED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'LISTING_EXPIRED'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres can't drop enum values (see NotificationTypesS438).
  }
}
