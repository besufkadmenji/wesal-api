import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S4-64: the Wesal Al-Khair threshold (category minimum commission) is
 * 100 SAR by default, for new and existing categories (PO 2026-11-17, #6).
 * Categories whose admin already set and enabled a minimum keep it, and a
 * non-zero Settings default stays (decision 2026-11-18, pending the PO).
 * Contracts already priced keep their charity flag.
 */
export class CharityThreshold1002026111900200 implements MigrationInterface {
  name = 'CharityThreshold1002026111900200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "settings" ALTER COLUMN "defaultMinCommissionAmount" SET DEFAULT '100'`,
    );
    await queryRunner.query(
      `UPDATE "settings" SET "defaultMinCommissionAmount" = 100 WHERE "defaultMinCommissionAmount" = 0`,
    );
    await queryRunner.query(`
      UPDATE "categories"
      SET "minCommissionAmount" = 100, "minCommissionEnabled" = true
      WHERE NOT "minCommissionEnabled"
         OR COALESCE("minCommissionAmount", 0) <= 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only the column default goes back: which rows were filled isn't
    // recorded, so the 100 SAR values stay.
    await queryRunner.query(
      `ALTER TABLE "settings" ALTER COLUMN "defaultMinCommissionAmount" SET DEFAULT '0'`,
    );
  }
}
