import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeContractDraft2026072200000 implements MigrationInterface {
  name = 'InitializeContractDraft2026072200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "contracts_status_enum" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'PENDING'
    `);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'InitializeContractDraft cannot be rolled back safely while draft contracts may exist.',
      ),
    );
  }
}
