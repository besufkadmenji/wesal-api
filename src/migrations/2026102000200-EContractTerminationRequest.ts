import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S4-58 (D-22, PO 2026-10-20): a provider's e-contract termination becomes a
 * request the admin approves or rejects.
 */
export class EContractTerminationRequest2026102000200 implements MigrationInterface {
  name = 'EContractTerminationRequest2026102000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."signed_contracts_status_enum" ADD VALUE IF NOT EXISTS 'TERMINATION_REQUESTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'ADMIN_ECONTRACT_TERMINATION_REQUESTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'ECONTRACT_TERMINATION_REJECTED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "signed_contracts"
        ADD COLUMN IF NOT EXISTS "terminationRequestedAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "terminationRequestReason" text,
        ADD COLUMN IF NOT EXISTS "terminationRejectedAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "terminationRejectionReason" text,
        ADD COLUMN IF NOT EXISTS "terminationDecidedByAdminId" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Enum values stay (Postgres can't drop them); pending requests go back
    // to ACTIVE so no row keeps a value the old code doesn't know.
    await queryRunner.query(
      `UPDATE "signed_contracts" SET "status" = 'ACTIVE' WHERE "status" = 'TERMINATION_REQUESTED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "signed_contracts"
        DROP COLUMN IF EXISTS "terminationDecidedByAdminId",
        DROP COLUMN IF EXISTS "terminationRejectionReason",
        DROP COLUMN IF EXISTS "terminationRejectedAt",
        DROP COLUMN IF EXISTS "terminationRequestReason",
        DROP COLUMN IF EXISTS "terminationRequestedAt"`,
    );
  }
}
