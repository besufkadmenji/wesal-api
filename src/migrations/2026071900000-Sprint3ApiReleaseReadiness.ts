import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint3ApiReleaseReadiness2026071900000 implements MigrationInterface {
  name = 'Sprint3ApiReleaseReadiness2026071900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
        ADD COLUMN IF NOT EXISTS "commissionEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "minCommissionEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "depositEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "maxCompletionDaysEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "maxTerminationDaysEnabled" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE "categories" SET
        "commissionEnabled" = COALESCE("commissionPercent", 0) > 0,
        "minCommissionEnabled" = COALESCE("minCommissionAmount", 0) > 0,
        "depositEnabled" = COALESCE("depositPercent", 0) > 0,
        "maxCompletionDaysEnabled" = "maxCompletionDays" IS NOT NULL,
        "maxTerminationDaysEnabled" = "maxTerminationDays" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "settings"
        ADD COLUMN IF NOT EXISTS "vatEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "contractAcceptanceWindowEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "contractAcceptanceWindowDays" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "premiumAdEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "premiumAdFee" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "premiumAdDurationDays" integer NOT NULL DEFAULT 30
    `);
    await queryRunner.query(`
      UPDATE "settings"
      SET "vatEnabled" = COALESCE("vatRate", 0) > 0
    `);

    await queryRunner.query(`
      ALTER TABLE "conversations"
        ADD COLUMN IF NOT EXISTS "expiresAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "closedAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "closeReason" varchar(100),
        ADD COLUMN IF NOT EXISTS "feeCycle" integer NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_conversation_expiry"
      ON "conversations" ("status", "expiresAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "contracts"
        ADD COLUMN IF NOT EXISTS "pricingVersion" integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "totalPayable" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "providerNetAmount" numeric(10,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "contracts" SET
        "pricingVersion" = 1,
        "totalPayable" = ROUND(COALESCE("agreedPrice", 0), 2),
        "providerNetAmount" = ROUND(
          GREATEST(COALESCE("agreedPrice", 0) - COALESCE("commissionAmount", 0), 0),
          2
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "contracts" ALTER COLUMN "pricingVersion" SET DEFAULT 2
    `);

    await queryRunner.query(`
      ALTER TYPE "listings_status_enum" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT'
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "listings_promotionstatus_enum" AS ENUM
          ('NONE', 'PENDING_PAYMENT', 'ACTIVE', 'EXPIRED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "listings"
        ADD COLUMN IF NOT EXISTS "promotionStatus" "listings_promotionstatus_enum" NOT NULL DEFAULT 'NONE',
        ADD COLUMN IF NOT EXISTS "promotionCycle" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "featuredStartsAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "featuredEndsAt" timestamptz
    `);
    await queryRunner.query(`
      UPDATE "listings"
      SET "promotionStatus" = 'ACTIVE', "promotionCycle" = 1
      WHERE "type" = 'FEATURED' AND "promotionCycle" = 0
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listing_featured_expiry"
      ON "listings" ("promotionStatus", "featuredEndsAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "listingId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD CONSTRAINT "FK_payment_listing"
        FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_listing_purpose"
      ON "payments" ("listingId", "purpose")
    `);

    await this.migrateFavorites(queryRunner);
    await this.migrateComplaints(queryRunner);

    await queryRunner.query(`
      UPDATE "messages"
      SET "content" = regexp_replace(
        regexp_replace(
          "content",
          '[A-Z0-9._%+\\-]+@[A-Z0-9.\\-]+\\.[A-Z]{2,}',
          '[contact hidden]',
          'gi'
        ),
        '(\\+?[0-9][0-9 ()\\-]{5,}[0-9])',
        '[contact hidden]',
        'g'
      )
      WHERE "kind" = 'TEXT'
    `);

    await this.seedPermissions(queryRunner);
  }

  private async migrateFavorites(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('favorites'))) return;
    if (!(await queryRunner.hasColumn('favorites', 'providerId'))) {
      await queryRunner.query(
        `ALTER TABLE "favorites" ADD COLUMN "providerId" uuid`,
      );
      await queryRunner.query(`
        UPDATE "favorites" favorite
        SET "providerId" = listing."providerId"
        FROM "listings" listing
        WHERE listing."id" = favorite."listingId"
      `);
    }

    const table = await queryRunner.getTable('favorites');
    for (const foreignKey of table?.foreignKeys ?? []) {
      if (foreignKey.columnNames.includes('listingId')) {
        await queryRunner.dropForeignKey('favorites', foreignKey);
      }
    }
    for (const unique of table?.uniques ?? []) {
      if (unique.columnNames.includes('listingId')) {
        await queryRunner.dropUniqueConstraint('favorites', unique);
      }
    }
    await queryRunner.query(`
      DELETE FROM "favorites" first
      USING "favorites" duplicate
      WHERE first."userId" = duplicate."userId"
        AND first."providerId" = duplicate."providerId"
        AND first."id" > duplicate."id"
    `);
    await queryRunner.query(
      `DELETE FROM "favorites" WHERE "providerId" IS NULL`,
    );
    if (await queryRunner.hasColumn('favorites', 'listingId')) {
      await queryRunner.query(
        `ALTER TABLE "favorites" DROP COLUMN "listingId"`,
      );
    }
    await queryRunner.query(`
      ALTER TABLE "favorites"
        ALTER COLUMN "providerId" SET NOT NULL,
        ADD CONSTRAINT "FK_favorite_provider"
          FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "UQ_favorite_user_provider" UNIQUE ("userId", "providerId")
    `);
  }

  private async migrateComplaints(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('complaints')) {
      await queryRunner.query(`
        ALTER TABLE "complaints" RENAME TO "complaints_legacy_20260719"
      `);
    }
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "complaints_reportertype_enum" AS ENUM ('USER', 'PROVIDER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE "complaints" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "publicId" bigint UNIQUE DEFAULT nextval('public_id_seq'),
        "reporterId" uuid NOT NULL,
        "reporterType" "complaints_reportertype_enum" NOT NULL,
        "listingId" uuid NOT NULL,
        "conversationId" uuid NOT NULL,
        "contractId" uuid,
        "title" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" "complaints_status_enum" NOT NULL DEFAULT 'PENDING',
        "reviewedByAdminId" uuid,
        "reviewedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_complaints_sprint3" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_complaint_reporter_conversation"
          UNIQUE ("reporterId", "reporterType", "conversationId"),
        CONSTRAINT "FK_complaint_listing" FOREIGN KEY ("listingId")
          REFERENCES "listings"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_complaint_conversation" FOREIGN KEY ("conversationId")
          REFERENCES "conversations"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_complaint_contract" FOREIGN KEY ("contractId")
          REFERENCES "contracts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_complaint_reviewer" FOREIGN KEY ("reviewedByAdminId")
          REFERENCES "admins"("id") ON DELETE SET NULL
      )
    `);
    if (await queryRunner.hasTable('complaints_legacy_20260719')) {
      await queryRunner.query(`
        WITH mapped AS (
          SELECT legacy.*,
            conversation."id" AS "mappedConversationId",
            ROW_NUMBER() OVER (
              PARTITION BY legacy."userId", conversation."id"
              ORDER BY legacy."createdAt", legacy."id"
            ) AS rank
          FROM "complaints_legacy_20260719" legacy
          JOIN LATERAL (
            SELECT candidate."id"
            FROM "conversations" candidate
            WHERE candidate."userId" = legacy."userId"
              AND candidate."listingId" = legacy."listingId"
            ORDER BY candidate."createdAt" DESC
            LIMIT 1
          ) conversation ON true
        )
        INSERT INTO "complaints" (
          "id", "reporterId", "reporterType", "listingId", "conversationId",
          "title", "description", "status", "reviewedAt", "createdAt", "updatedAt"
        )
        SELECT "id", "userId", 'USER', "listingId", "mappedConversationId",
          'Legacy complaint: ' || "reason"::text, "description", "status",
          "reviewedAt", "createdAt", "updatedAt"
        FROM mapped WHERE rank = 1
      `);
    }
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "complaint_messages_authortype_enum" AS ENUM ('REPORTER', 'ADMIN');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE "complaint_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "complaintId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "authorType" "complaint_messages_authortype_enum" NOT NULL,
        "content" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_complaint_messages_sprint3" PRIMARY KEY ("id"),
        CONSTRAINT "FK_complaint_message_complaint" FOREIGN KEY ("complaintId")
          REFERENCES "complaints"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_complaint_status_created" ON "complaints" ("status", "createdAt");
      CREATE INDEX "IDX_complaint_message_thread" ON "complaint_messages" ("complaintId", "createdAt")
    `);
  }

  private async seedPermissions(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
      ['conversation', 'read', 'Read Conversation', 'عرض المحادثات'],
      [
        'conversation',
        'full_access',
        'Full Access Conversation',
        'وصول كامل للمحادثات',
      ],
      ['complaint', 'read', 'Read Complaint', 'عرض الشكاوى'],
      ['complaint', 'update', 'Update Complaint', 'تحديث الشكاوى'],
      [
        'complaint',
        'full_access',
        'Full Access Complaint',
        'وصول كامل للشكاوى',
      ],
      ['contract', 'read', 'Read Contract', 'عرض العقود'],
      ['contract', 'full_access', 'Full Access Contract', 'وصول كامل للعقود'],
      [
        'listing_promotion',
        'read',
        'Read Listing Promotion',
        'عرض ترويج الإعلانات',
      ],
      [
        'listing_promotion',
        'update',
        'Update Listing Promotion',
        'تحديث ترويج الإعلانات',
      ],
      [
        'listing_promotion',
        'full_access',
        'Full Access Listing Promotion',
        'وصول كامل لترويج الإعلانات',
      ],
    ];
    for (const [module, action, name, nameAr] of permissions) {
      await queryRunner.query(
        `INSERT INTO "permissions"
          ("id", "name", "nameAr", "description", "module", "action", "resource", "permissionPlatform")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $4, 'ADMIN')
         ON CONFLICT ("module", "action", "resource") DO NOTHING`,
        [name, nameAr, `Can ${action} ${module}`, module, action],
      );
    }
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'Sprint3ApiReleaseReadiness cannot be rolled back losslessly: favorites were consolidated by provider, complaints were contextualized, and historical contact data was irreversibly redacted. Legacy complaints remain preserved in complaints_legacy_20260719.',
      ),
    );
  }
}
