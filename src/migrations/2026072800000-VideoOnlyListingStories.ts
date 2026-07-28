import { MigrationInterface, QueryRunner } from 'typeorm';

export class VideoOnlyListingStories2026072800000 implements MigrationInterface {
  name = 'VideoOnlyListingStories2026072800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listings"
      ALTER COLUMN "story" DROP NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "listings"
      SET "story" = NULL
      WHERE "story" IS NOT NULL
        AND UPPER(COALESCE("story" ->> 'type', '')) <> 'VIDEO'
    `);
  }

  public down(): Promise<void> {
    // Removed non-video story data cannot be reconstructed safely.
    return Promise.resolve();
  }
}
