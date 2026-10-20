import { MigrationInterface, QueryRunner } from 'typeorm';

const WITHOUT_CUSTOMER_SIGNATURE = `NOT EXISTS (
  SELECT 1 FROM "contract_signatures" s
  WHERE s."contractId" = c."id" AND s."signatureType" = 'CUSTOMER_COMPLETION'
)`;

/**
 * Contracts the administration completed before the Q-C3 decision (dispute
 * release or overdue completion, no customer signature) were stored as
 * COMPLETED; they become ADMIN_RESOLVED. Needs the enum value committed by
 * ContractAdminResolvedStatus, so migrations run with mode 'each'.
 */
export class ContractAdminResolvedBackfill2026101900300 implements MigrationInterface {
  name = 'ContractAdminResolvedBackfill2026101900300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "contracts" c
       SET "status" = 'ADMIN_RESOLVED',
           "resolvedAt" = c."completedAt",
           "completedAt" = NULL
       WHERE c."status" = 'COMPLETED' AND ${WITHOUT_CUSTOMER_SIGNATURE}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "contracts" c
       SET "status" = 'COMPLETED',
           "completedAt" = c."resolvedAt",
           "resolvedAt" = NULL
       WHERE c."status" = 'ADMIN_RESOLVED'`,
    );
  }
}
