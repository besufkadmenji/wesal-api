import { MigrationInterface, QueryRunner } from 'typeorm';

export class ParticipantWebApiSeams2026071901000 implements MigrationInterface {
  name = 'ParticipantWebApiSeams2026071901000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversations"
        ADD COLUMN IF NOT EXISTS "lastActivityAt" timestamptz
    `);
    await queryRunner.query(`
      UPDATE "conversations" conversation
      SET "lastActivityAt" = COALESCE(
        (
          SELECT MAX(message."createdAt")
          FROM "messages" message
          WHERE message."conversationId" = conversation."id"
        ),
        conversation."createdAt"
      )
      WHERE conversation."lastActivityAt" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "conversations"
        ALTER COLUMN "lastActivityAt" SET DEFAULT now(),
        ALTER COLUMN "lastActivityAt" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_conversation_last_activity"
      ON "conversations" ("lastActivityAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_conversation_last_activity"`,
    );
    await queryRunner.query(`
      ALTER TABLE "conversations" DROP COLUMN IF EXISTS "lastActivityAt"
    `);
  }
}
