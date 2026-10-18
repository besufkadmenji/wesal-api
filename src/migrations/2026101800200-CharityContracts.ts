import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wesal Al-Khair (charity) contracts: a contract whose calculated commission
 * is at or below the category minimum has its commission waived (PO answer,
 * 2026-10-18). Stores the flag and the waived amount for the admin total.
 *
 * Backfill: contracts created under the old rule were waived when the price
 * was below the minimum, which left a commission percent with a zero amount.
 * Those are flagged with the commission they would have paid.
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
      SET "isCharity" = true,
          "charityAmount" = ROUND("agreedPrice" * "commissionPercent" / 100, 2)
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
