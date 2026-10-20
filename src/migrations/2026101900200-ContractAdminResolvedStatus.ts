import { MigrationInterface, QueryRunner } from 'typeorm';

const STATUS_TYPES = [
  'contracts_status_enum',
  'contract_audits_previousstatus_enum',
  'contract_audits_newstatus_enum',
];

/**
 * Decision 2026-10-19 (Q-C3): only the customer's completion signature makes a
 * contract COMPLETED. An administration payout without it ends the contract as
 * ADMIN_RESOLVED, stamped with resolvedAt.
 */
export class ContractAdminResolvedStatus2026101900200 implements MigrationInterface {
  name = 'ContractAdminResolvedStatus2026101900200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Appended values can't be used until this migration commits; the
    // backfill runs in the next one (migrationsTransactionMode: 'each').
    for (const type of STATUS_TYPES) {
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" ADD VALUE IF NOT EXISTS 'ADMIN_RESOLVED'`,
      );
    }
    await queryRunner.query(
      `ALTER TYPE "public"."messages_kind_enum" ADD VALUE IF NOT EXISTS 'CONTRACT_ADMIN_RESOLVED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "resolvedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The enum values stay (see NotificationTypesS438: Postgres can't drop
    // them); the backfill's down has already moved rows off ADMIN_RESOLVED.
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "resolvedAt"`);
  }
}
