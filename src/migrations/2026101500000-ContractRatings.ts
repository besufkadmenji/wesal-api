import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 4 ratings: one rating per completed contract, admin moderation
 * (PUBLISHED/HIDDEN), and cached listing/provider rating aggregates.
 *
 * Constraint names match TypeORM's default naming strategy so that a
 * synchronized dev schema and a migrated production schema stay identical.
 */
export class ContractRatings2026101500000 implements MigrationInterface {
  name = 'ContractRatings2026101500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Legacy rule "one rating per (user, listing)" no longer applies: a
    // customer may complete several contracts on the same listing.
    await queryRunner.query(`
      DO $$
      DECLARE legacy_constraint text;
      BEGIN
        FOR legacy_constraint IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'ratings'
            AND con.contype = 'u'
            AND (
              SELECT array_agg(att.attname::text ORDER BY att.attname)
              FROM unnest(con.conkey) AS key(attnum)
              JOIN pg_attribute att
                ON att.attrelid = con.conrelid AND att.attnum = key.attnum
            ) = ARRAY['listingId', 'userId']
        LOOP
          EXECUTE format('ALTER TABLE "ratings" DROP CONSTRAINT %I', legacy_constraint);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ratings_status_enum" AS ENUM ('PUBLISHED', 'HIDDEN');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "ratings"
        ADD COLUMN IF NOT EXISTS "providerId" uuid,
        ADD COLUMN IF NOT EXISTS "contractId" uuid,
        ADD COLUMN IF NOT EXISTS "status" "ratings_status_enum" NOT NULL DEFAULT 'PUBLISHED',
        ADD COLUMN IF NOT EXISTS "isSystemGenerated" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "moderatedByAdminId" uuid
    `);
    await queryRunner.query(`
      UPDATE "ratings" r
      SET "providerId" = l."providerId"
      FROM "listings" l
      WHERE l.id = r."listingId" AND r."providerId" IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "ratings" ALTER COLUMN "providerId" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "ratings"
        ADD CONSTRAINT "UQ_3c4ca767bb235de6a16cd45de9b" UNIQUE ("contractId"),
        ADD CONSTRAINT "FK_3c4ca767bb235de6a16cd45de9b"
          FOREIGN KEY ("contractId") REFERENCES "contracts"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_72ab9b2daed1b77350f834614f5"
          FOREIGN KEY ("providerId") REFERENCES "providers"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ratings_listing_status"
        ON "ratings" ("listingId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ratings_provider_status"
        ON "ratings" ("providerId", "status")
    `);

    for (const table of ['listings', 'providers']) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ADD COLUMN IF NOT EXISTS "ratingAverage" numeric(3,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "ratingCount" integer NOT NULL DEFAULT 0
      `);
    }

    // Backfill aggregates from existing (legacy, all published) ratings.
    await queryRunner.query(`
      UPDATE "listings" l
      SET "ratingAverage" = stats.average, "ratingCount" = stats.total
      FROM (
        SELECT "listingId", ROUND(AVG(rating)::numeric, 2) AS average, COUNT(*)::int AS total
        FROM "ratings"
        WHERE status = 'PUBLISHED'
        GROUP BY "listingId"
      ) stats
      WHERE stats."listingId" = l.id
    `);
    await queryRunner.query(`
      UPDATE "providers" p
      SET "ratingAverage" = stats.average, "ratingCount" = stats.total
      FROM (
        SELECT "providerId",
          ROUND(AVG("ratingAverage"), 2) AS average,
          SUM("ratingCount")::int AS total
        FROM "listings"
        WHERE "ratingCount" > 0
        GROUP BY "providerId"
      ) stats
      WHERE stats."providerId" = p.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['listings', 'providers']) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          DROP COLUMN IF EXISTS "ratingAverage",
          DROP COLUMN IF EXISTS "ratingCount"
      `);
    }
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ratings_provider_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ratings_listing_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "ratings"
        DROP CONSTRAINT IF EXISTS "FK_72ab9b2daed1b77350f834614f5",
        DROP CONSTRAINT IF EXISTS "FK_3c4ca767bb235de6a16cd45de9b",
        DROP CONSTRAINT IF EXISTS "UQ_3c4ca767bb235de6a16cd45de9b",
        DROP COLUMN IF EXISTS "moderatedByAdminId",
        DROP COLUMN IF EXISTS "moderatedAt",
        DROP COLUMN IF EXISTS "isSystemGenerated",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "contractId",
        DROP COLUMN IF EXISTS "providerId"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "ratings_status_enum"`);
    // The legacy (userId, listingId) uniqueness is not restored: contract
    // ratings may legitimately repeat that pair.
  }
}
