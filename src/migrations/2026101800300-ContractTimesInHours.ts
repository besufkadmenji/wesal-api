import { MigrationInterface, QueryRunner } from 'typeorm';

/** [table, old column (days), new column (hours)] — values are multiplied by 24. */
const VALUE_COLUMNS: Array<[string, string, string]> = [
  ['categories', 'maxCompletionDays', 'maxExecutionHours'],
  ['categories', 'maxTerminationDays', 'maxTerminationHours'],
  ['contracts', 'maxCompletionDays', 'maxExecutionHours'],
  ['contracts', 'maxTerminationDays', 'maxTerminationHours'],
  ['contracts', 'deliveryTimeDays', 'executionHours'],
  ['contracts', 'deliveryEstimateDays', 'deliveryHours'],
];

/** Flags that only change name. */
const FLAG_COLUMNS: Array<[string, string, string]> = [
  ['categories', 'maxCompletionDaysEnabled', 'maxExecutionHoursEnabled'],
  ['categories', 'maxTerminationDaysEnabled', 'maxTerminationHoursEnabled'],
];

/**
 * PO 2026-10-18: execution and delivery time are tracked in hours. Renames
 * the day-based contract/category time columns (deliveryTimeDays was the
 * provider's execution time) and converts existing values days → hours.
 */
export class ContractTimesInHours2026101800300 implements MigrationInterface {
  name = 'ContractTimesInHours2026101800300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, from, to] of [...VALUE_COLUMNS, ...FLAG_COLUMNS]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}"`,
      );
    }
    for (const [table, , to] of VALUE_COLUMNS) {
      await queryRunner.query(
        `UPDATE "${table}" SET "${to}" = "${to}" * 24 WHERE "${to}" IS NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, , to] of VALUE_COLUMNS) {
      await queryRunner.query(
        `UPDATE "${table}" SET "${to}" = CEIL("${to}" / 24.0)::int WHERE "${to}" IS NOT NULL`,
      );
    }
    for (const [table, from, to] of [...VALUE_COLUMNS, ...FLAG_COLUMNS]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "${to}" TO "${from}"`,
      );
    }
  }
}
