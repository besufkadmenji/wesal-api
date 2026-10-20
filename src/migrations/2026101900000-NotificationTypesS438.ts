import { MigrationInterface, QueryRunner } from 'typeorm';

const TYPES = [
  'CHAT_STARTED',
  'CHAT_ENDED',
  'CHAT_FEE_PAID',
  'LISTING_FEATURED',
  'LISTING_FEATURED_EXPIRED',
  'PAYOUT_TRANSFERRED',
  'REFUND_ISSUED',
];

/** S4-38: customer/provider notifications for payments, chats, ads, payouts. */
export class NotificationTypesS4382026101900000 implements MigrationInterface {
  name = 'NotificationTypesS4382026101900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Appending enum values avoids rewriting the notifications table.
    for (const type of TYPES) {
      await queryRunner.query(
        `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS '${type}'`,
      );
    }
  }

  public async down(): Promise<void> {
    // Postgres can't drop enum values without rebuilding the type, and rows
    // may already use them; the extra values are harmless, so they stay.
  }
}
