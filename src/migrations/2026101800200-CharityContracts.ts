import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wesal Al-Khair (charity) contracts: a contract whose calculated commission
 * is at or below the category minimum is charity (PO answer, 2026-10-18).
 * Its commission is still deducted from the provider, but set aside for
 * donation; `charityAmount` holds that amount for the admin total.
 *
 * Backfill: contracts created under the old rule had their commission waived
 * when the price was below the minimum (a percent with a zero amount). They
 * are flagged as charity, but nothing was collected, so their charityAmount
 * stays 0 and they add nothing to the donation total.
 */
export class CharityContracts2026101800200 implements MigrationInterface {
  name = 'CharityContracts2026101800200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "isCharity" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "charityAmount" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`
      UPDATE "contracts"
      SET "isCharity" = true
      WHERE "commissionPercent" > 0 AND "commissionAmount" = 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "charityAmount"`,
    );
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "isCharity"`);
  }
}
