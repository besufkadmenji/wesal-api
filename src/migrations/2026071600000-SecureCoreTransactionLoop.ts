import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureCoreTransactionLoop2026071600000 implements MigrationInterface {
  name = 'SecureCoreTransactionLoop2026071600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
        ADD COLUMN IF NOT EXISTS "commissionPercent" numeric(5,2),
        ADD COLUMN IF NOT EXISTS "minCommissionAmount" numeric(10,2),
        ADD COLUMN IF NOT EXISTS "depositPercent" numeric(5,2),
        ADD COLUMN IF NOT EXISTS "maxCompletionDays" integer,
        ADD COLUMN IF NOT EXISTS "maxTerminationDays" integer,
        ADD COLUMN IF NOT EXISTS "customerConversationFee" numeric(10,2),
        ADD COLUMN IF NOT EXISTS "customerConversationFeeEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "providerConversationFee" numeric(10,2),
        ADD COLUMN IF NOT EXISTS "providerConversationFeeEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "contractDocumentEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "contractDocumentText" text NOT NULL DEFAULT ''
    `);
    if (await queryRunner.hasColumn('categories', 'conversationFee')) {
      await queryRunner.query(`
        UPDATE "categories"
        SET
          "customerConversationFee" = "conversationFee",
          "providerConversationFee" = "conversationFee",
          "customerConversationFeeEnabled" = COALESCE("conversationFee", 0) > 0,
          "providerConversationFeeEnabled" = COALESCE("conversationFee", 0) > 0
      `);
      await queryRunner.query(
        `ALTER TABLE "categories" DROP COLUMN "conversationFee"`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "settings"
        ADD COLUMN IF NOT EXISTS "vatRate" numeric(5,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "conversations_status_enum" AS ENUM ('ACTIVE', 'CLOSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "conversations"
        ADD COLUMN IF NOT EXISTS "status" "conversations_status_enum" NOT NULL DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS "customerFeePaidAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "providerFeePaidAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "customerLastReadAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "providerLastReadAt" timestamptz
    `);
    if (await queryRunner.hasColumn('conversations', 'isPaid')) {
      await queryRunner.query(`
        UPDATE "conversations"
        SET
          "customerFeePaidAt" = CASE WHEN "isPaid" THEN "updatedAt" ELSE NULL END,
          "providerFeePaidAt" = CASE WHEN "isPaid" THEN "updatedAt" ELSE NULL END
      `);
      await queryRunner.query(
        `ALTER TABLE "conversations" DROP COLUMN "isPaid"`,
      );
    }
    const conversationTable = await queryRunner.getTable('conversations');
    const providerForeignKey = conversationTable?.foreignKeys.find(
      (foreignKey) => foreignKey.columnNames.includes('providerId'),
    );
    if (providerForeignKey) {
      await queryRunner.dropForeignKey('conversations', providerForeignKey);
    }
    await queryRunner.query(`
      ALTER TABLE "conversations"
        ADD CONSTRAINT "FK_conversation_provider"
        FOREIGN KEY ("providerId") REFERENCES "providers"("id")
        ON DELETE NO ACTION
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "messages_sendertype_enum" ADD VALUE IF NOT EXISTS 'SYSTEM';
      EXCEPTION WHEN undefined_object THEN
        CREATE TYPE "messages_sendertype_enum" AS ENUM ('USER', 'PROVIDER', 'SYSTEM');
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "messages_kind_enum" AS ENUM (
          'TEXT', 'CONTRACT_CREATED', 'CONTRACT_ACCEPTED',
          'CONTRACT_REJECTED', 'CONTRACT_RESENT', 'CONTRACT_PAID',
          'CHAT_FEE_PAID'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "messages"
        ALTER COLUMN "senderId" DROP NOT NULL,
        ALTER COLUMN "content" SET DEFAULT '',
        ADD COLUMN IF NOT EXISTS "senderType" "messages_sendertype_enum" NOT NULL DEFAULT 'USER',
        ADD COLUMN IF NOT EXISTS "kind" "messages_kind_enum" NOT NULL DEFAULT 'TEXT',
        ADD COLUMN IF NOT EXISTS "metadata" jsonb
    `);
    const messageTable = await queryRunner.getTable('messages');
    const senderForeignKey = messageTable?.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('senderId'),
    );
    if (senderForeignKey) {
      await queryRunner.dropForeignKey('messages', senderForeignKey);
    }

    await queryRunner.query(`
      ALTER TABLE "contracts"
        ADD COLUMN IF NOT EXISTS "listingId" uuid,
        ADD COLUMN IF NOT EXISTS "categoryId" uuid,
        ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "supersedesContractId" uuid,
        ADD COLUMN IF NOT EXISTS "depositPercent" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "commissionPercent" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "commissionAmount" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "vatRate" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "vatAmount" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "customerAddress" text,
        ADD COLUMN IF NOT EXISTS "customerLatitude" numeric(10,8),
        ADD COLUMN IF NOT EXISTS "customerLongitude" numeric(11,8),
        ADD COLUMN IF NOT EXISTS "providerAddress" text,
        ADD COLUMN IF NOT EXISTS "providerLatitude" numeric(10,8),
        ADD COLUMN IF NOT EXISTS "providerLongitude" numeric(11,8),
        ADD COLUMN IF NOT EXISTS "deliveryCompanyId" uuid,
        ADD COLUMN IF NOT EXISTS "deliveryCompanyNameEn" text,
        ADD COLUMN IF NOT EXISTS "deliveryCompanyNameAr" text,
        ADD COLUMN IF NOT EXISTS "categoryRulesEn" text NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "categoryRulesAr" text NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "contractDocumentText" text NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "maxCompletionDays" integer,
        ADD COLUMN IF NOT EXISTS "maxTerminationDays" integer,
        ADD COLUMN IF NOT EXISTS "deliveryTimeDays" integer,
        ADD COLUMN IF NOT EXISTS "rejectionReason" text,
        ADD COLUMN IF NOT EXISTS "acceptedAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "rejectedAt" timestamptz
    `);
    await queryRunner.query(`
      UPDATE "contracts" contract
      SET
        "listingId" = conversation."listingId",
        "categoryId" = listing."categoryId",
        "customerAddress" = COALESCE(
          (SELECT "address" FROM "users" WHERE "id" = contract."clientId"),
          ''
        ),
        "customerLatitude" = (
          SELECT "latitude" FROM "users" WHERE "id" = contract."clientId"
        ),
        "customerLongitude" = (
          SELECT "longitude" FROM "users" WHERE "id" = contract."clientId"
        ),
        "providerAddress" = (
          SELECT "address" FROM "providers" WHERE "id" = contract."providerId"
        ),
        "providerLatitude" = (
          SELECT "latitude" FROM "providers" WHERE "id" = contract."providerId"
        ),
        "providerLongitude" = (
          SELECT "longitude" FROM "providers" WHERE "id" = contract."providerId"
        ),
        "categoryRulesEn" = COALESCE(listing_category."rulesEn", ''),
        "categoryRulesAr" = COALESCE(listing_category."rulesAr", ''),
        "contractDocumentText" = CASE
          WHEN COALESCE(listing_category."contractDocumentEnabled", false)
            THEN COALESCE(listing_category."contractDocumentText", '')
          ELSE ''
        END,
        "maxCompletionDays" = listing_category."maxCompletionDays",
        "maxTerminationDays" = listing_category."maxTerminationDays",
        "depositPercent" = CASE
          WHEN contract."agreedPrice" > 0
            THEN ROUND((contract."downPayment" / contract."agreedPrice") * 100, 2)
          ELSE COALESCE(listing_category."depositPercent", 0)
        END,
        "commissionPercent" = COALESCE(listing_category."commissionPercent", 0),
        "commissionAmount" = CASE
          WHEN COALESCE(listing_category."minCommissionAmount", 0) <= 0
            OR contract."agreedPrice" >= listing_category."minCommissionAmount"
          THEN ROUND(
            contract."agreedPrice" *
              (COALESCE(listing_category."commissionPercent", 0) / 100),
            2
          )
          ELSE 0
        END,
        "vatRate" = COALESCE(
          (SELECT setting."vatRate" FROM "settings" setting LIMIT 1),
          0
        )
      FROM "conversations" conversation
      JOIN "listings" listing ON listing."id" = conversation."listingId"
      JOIN "categories" listing_category ON listing_category."id" = listing."categoryId"
      WHERE conversation."id" = contract."conversationId"
    `);
    await queryRunner.query(`
      UPDATE "contracts"
      SET
        "vatAmount" = ROUND(
          "commissionAmount" * ("vatRate" / 100),
          2
        ),
        "acceptedAt" = CASE
          WHEN "status" IN ('ACCEPTED', 'IN_PROGRESS', 'COMPLETED')
            THEN "updatedAt"
          ELSE "acceptedAt"
        END,
        "rejectedAt" = CASE
          WHEN "status" = 'REJECTED' THEN "updatedAt"
          ELSE "rejectedAt"
        END
    `);
    await queryRunner.query(`
      ALTER TABLE "contracts"
        ALTER COLUMN "listingId" SET NOT NULL,
        ALTER COLUMN "categoryId" SET NOT NULL,
        ALTER COLUMN "customerAddress" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "contracts"
        ADD CONSTRAINT "FK_contract_supersedes"
        FOREIGN KEY ("supersedesContractId") REFERENCES "contracts"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "contracts"
        ADD CONSTRAINT "UQ_contract_conversation_version"
        UNIQUE ("conversationId", "version")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_signatures_signertype_enum" AS ENUM ('USER', 'PROVIDER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_signatures_signaturetype_enum" AS ENUM (
          'CUSTOMER_ACCEPTANCE', 'PROVIDER_ACCEPTANCE'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "contract_signatures"
        ADD COLUMN IF NOT EXISTS "signerId" uuid,
        ADD COLUMN IF NOT EXISTS "signerType" "contract_signatures_signertype_enum",
        ADD COLUMN IF NOT EXISTS "signatureType" "contract_signatures_signaturetype_enum"
    `);
    if (await queryRunner.hasColumn('contract_signatures', 'userId')) {
      await queryRunner.query(`
        UPDATE "contract_signatures"
        SET
          "signerId" = "userId",
          "signerType" = 'USER',
          "signatureType" = 'CUSTOMER_ACCEPTANCE'
      `);
      const signatureTable = await queryRunner.getTable('contract_signatures');
      const userForeignKey = signatureTable?.foreignKeys.find((foreignKey) =>
        foreignKey.columnNames.includes('userId'),
      );
      if (userForeignKey) {
        await queryRunner.dropForeignKey('contract_signatures', userForeignKey);
      }
      await queryRunner.query(
        `ALTER TABLE "contract_signatures" DROP COLUMN "userId"`,
      );
    }
    await queryRunner.query(`
      ALTER TABLE "contract_signatures"
        ALTER COLUMN "signerId" SET NOT NULL,
        ALTER COLUMN "signerType" SET NOT NULL,
        ALTER COLUMN "signatureType" SET NOT NULL,
        ADD CONSTRAINT "UQ_contract_signature_type"
        UNIQUE ("contractId", "signatureType")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payments_purpose_enum" AS ENUM (
          'CONTRACT', 'CHAT_CUSTOMER', 'CHAT_PROVIDER', 'PREMIUM_AD'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payments_payertype_enum" AS ENUM ('USER', 'PROVIDER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "payments" ALTER COLUMN "paymentMethod" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TYPE "payments_paymentmethod_enum"
        RENAME TO "payments_paymentmethod_enum_legacy"
    `);
    await queryRunner.query(`
      CREATE TYPE "payments_paymentmethod_enum" AS ENUM (
        'MOCK', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH',
        'BANK_TRANSFER', 'WALLET'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
        ALTER COLUMN "paymentMethod" TYPE "payments_paymentmethod_enum"
        USING "paymentMethod"::text::"payments_paymentmethod_enum"
    `);
    await queryRunner.query(`DROP TYPE "payments_paymentmethod_enum_legacy"`);
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "purpose" "payments_purpose_enum",
        ADD COLUMN IF NOT EXISTS "payerId" uuid,
        ADD COLUMN IF NOT EXISTS "payerType" "payments_payertype_enum",
        ADD COLUMN IF NOT EXISTS "obligationKey" varchar(255),
        ADD COLUMN IF NOT EXISTS "conversationId" uuid,
        ADD COLUMN IF NOT EXISTS "categoryId" uuid,
        ADD COLUMN IF NOT EXISTS "commissionPercent" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "commissionAmount" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "vatRate" numeric(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "vatAmount" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "configSnapshot" jsonb
    `);
    if (await queryRunner.hasColumn('payments', 'userId')) {
      await queryRunner.query(`
        WITH ranked AS (
          SELECT
            "id",
            ROW_NUMBER() OVER (
              PARTITION BY "contractId", "userId"
              ORDER BY "createdAt" DESC, "id" DESC
            ) AS rank
          FROM "payments"
        )
        UPDATE "payments" payment
        SET
          "purpose" = 'CONTRACT',
          "payerId" = payment."userId",
          "payerType" = 'USER',
          "obligationKey" = CASE
            WHEN ranked.rank = 1 THEN
              'CONTRACT:' || payment."contractId" || ':USER:' || payment."userId"
            ELSE
              'CONTRACT:' || payment."contractId" || ':USER:' || payment."userId" || ':LEGACY:' || payment."id"
          END,
          "conversationId" = contract."conversationId",
          "categoryId" = contract."categoryId",
          "commissionPercent" = contract."commissionPercent",
          "vatRate" = contract."vatRate"
        FROM ranked, "contracts" contract
        WHERE ranked."id" = payment."id" AND contract."id" = payment."contractId"
      `);
      const paymentTable = await queryRunner.getTable('payments');
      const userForeignKey = paymentTable?.foreignKeys.find((foreignKey) =>
        foreignKey.columnNames.includes('userId'),
      );
      if (userForeignKey) {
        await queryRunner.dropForeignKey('payments', userForeignKey);
      }
      await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "userId"`);
    }
    await queryRunner.query(`
      UPDATE "payments"
      SET
        "commissionAmount" = COALESCE("commissionAmount", 0),
        "vatAmount" = COALESCE("vatAmount", 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
        ALTER COLUMN "contractId" DROP NOT NULL,
        ALTER COLUMN "purpose" SET NOT NULL,
        ALTER COLUMN "payerId" SET NOT NULL,
        ALTER COLUMN "payerType" SET NOT NULL,
        ALTER COLUMN "obligationKey" SET NOT NULL,
        ALTER COLUMN "commissionAmount" SET DEFAULT 0,
        ALTER COLUMN "commissionAmount" SET NOT NULL,
        ALTER COLUMN "vatAmount" SET DEFAULT 0,
        ALTER COLUMN "vatAmount" SET NOT NULL,
        ALTER COLUMN "paymentMethod" SET DEFAULT 'MOCK',
        ALTER COLUMN "status" SET DEFAULT 'COMPLETED',
        ADD CONSTRAINT "UQ_payment_obligation_key" UNIQUE ("obligationKey"),
        ADD CONSTRAINT "FK_payment_conversation"
          FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
          ON DELETE SET NULL
    `);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'SecureCoreTransactionLoop cannot be safely rolled back: provider/system messages, immutable contract versions, and provider-paid obligations have no lossless legacy representation.',
      ),
    );
  }
}
