import { MigrationInterface, QueryRunner } from 'typeorm';

const COLUMNS = [
  'defaultCommissionPercent',
  'defaultMinCommissionAmount',
  'defaultMaxExecutionHours',
  'defaultMaxTerminationHours',
  'defaultDepositPercent',
  'defaultCustomerConversationFee',
  'defaultProviderConversationFee',
];

/**
 * BRD 4.3.17: global contract defaults (integers, 0 when unset) that new
 * categories inherit (BRD 4.3.8).
 */
export class CategoryContractDefaults2026101800400 implements MigrationInterface {
  name = 'CategoryContractDefaults2026101800400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "settings" ADD "${column}" integer NOT NULL DEFAULT '0'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of [...COLUMNS].reverse()) {
      await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "${column}"`);
    }
  }
}
