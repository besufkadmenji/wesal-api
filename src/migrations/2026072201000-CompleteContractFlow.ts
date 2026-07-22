import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteContractFlow2026072201000 implements MigrationInterface {
  name = 'CompleteContractFlow2026072201000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "contract_signatures_signaturetype_enum"
      ADD VALUE IF NOT EXISTS 'CUSTOMER_COMPLETION'
    `);
    await queryRunner.query(`
      ALTER TYPE "messages_kind_enum"
      ADD VALUE IF NOT EXISTS 'CONTRACT_COMPLETED'
    `);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'CompleteContractFlow cannot be rolled back safely while completion signatures or events may exist.',
      ),
    );
  }
}
