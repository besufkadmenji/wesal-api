import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S4-2: stamp when a contract's provider or customer became overdue, so the
 * overdue job notifies each party once; plus the CONTRACT_OVERDUE type.
 */
export class ContractOverdueFlags2026101900100 implements MigrationInterface {
  name = 'ContractOverdueFlags2026101900100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "providerOverdueAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "customerOverdueAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'CONTRACT_OVERDUE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The enum value stays (see NotificationTypesS438: Postgres can't drop it).
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "customerOverdueAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "providerOverdueAt"`,
    );
  }
}
