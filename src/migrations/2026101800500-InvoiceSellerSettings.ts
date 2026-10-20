import { MigrationInterface, QueryRunner } from 'typeorm';

const COLUMNS = [
  'sellerLegalNameAr',
  'sellerLegalNameEn',
  'sellerVatNumber',
  'sellerCrNumber',
  'sellerAddress',
];

/** S4-37: seller identity printed on internal tax invoices (no ZATCA). */
export class InvoiceSellerSettings2026101800500 implements MigrationInterface {
  name = 'InvoiceSellerSettings2026101800500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of COLUMNS) {
      await queryRunner.query(`ALTER TABLE "settings" ADD "${column}" text`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of [...COLUMNS].reverse()) {
      await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "${column}"`);
    }
  }
}
