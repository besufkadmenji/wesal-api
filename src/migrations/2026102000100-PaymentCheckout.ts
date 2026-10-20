import { MigrationInterface, QueryRunner } from 'typeorm';

const LIMIT_COLUMNS = [
  'tabbyMinAmount',
  'tabbyMaxAmount',
  'tamaraMinAmount',
  'tamaraMaxAmount',
];

/**
 * S4-6 / S4-10 / S4-12: payments go through a gateway checkout (redirect +
 * signed webhook) instead of settling instantly.
 *
 * - payment methods the customer picks: ELECTRONIC (card/mada), TABBY, TAMARA;
 * - payments track the gateway, the current checkout attempt and its outcome;
 * - settings hold the Tabby/Tamara amount bounds;
 * - contracts record when the provider saw the "contract paid" pop-up;
 *   contracts already paid count as seen, so they never pop up.
 */
export class PaymentCheckout2026102000100 implements MigrationInterface {
  name = 'PaymentCheckout2026102000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of ['ELECTRONIC', 'TABBY', 'TAMARA']) {
      await queryRunner.query(
        `ALTER TYPE "public"."payments_paymentmethod_enum" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }
    for (const column of LIMIT_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "settings" ADD "${column}" numeric(10,2)`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "providerPaidNoticeAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "contracts" SET "providerPaidNoticeAt" = "paidAt" WHERE "paidAt" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "gateway" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "checkoutReference" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "UQ_a1f9cca08ce218ab4c775bd8f45" UNIQUE ("checkoutReference")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "paidAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "failedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "payments" ADD "failureReason" text`);
    // Settled mock rows were paid when they were written.
    await queryRunner.query(
      `UPDATE "payments" SET "paidAt" = "createdAt", "gateway" = 'MOCK' WHERE "status" = 'COMPLETED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The enum values stay (see NotificationTypesS438: Postgres can't drop them).
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "failureReason"`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "failedAt"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "paidAt"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "UQ_a1f9cca08ce218ab4c775bd8f45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "checkoutReference"`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "gateway"`);
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "providerPaidNoticeAt"`,
    );
    for (const column of [...LIMIT_COLUMNS].reverse()) {
      await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "${column}"`);
    }
  }
}
