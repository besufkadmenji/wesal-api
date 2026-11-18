import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S4-67: a chat closes `settings.chatCloseAfterCompletionHours` (default 24)
 * after its contract is completed (PO 2026-11-17, #9 and #10). Chats whose
 * contract was completed before this ships get the 24 hours from release,
 * like free ads did (#2), rather than closing at once.
 */
export class ChatCloseAfterCompletion2026111900100 implements MigrationInterface {
  name = 'ChatCloseAfterCompletion2026111900100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "closesAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "settings" ADD "chatCloseAfterCompletionHours" integer NOT NULL DEFAULT '24'`,
    );
    await queryRunner.query(`
      UPDATE "conversations" c
      SET "closesAt" = now() + interval '24 hours'
      WHERE c."status" = 'ACTIVE'
        AND EXISTS (
          SELECT 1 FROM "contracts" k
          WHERE k."conversationId" = c."id" AND k."status" = 'COMPLETED'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "settings" DROP COLUMN "chatCloseAfterCompletionHours"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "closesAt"`,
    );
  }
}
