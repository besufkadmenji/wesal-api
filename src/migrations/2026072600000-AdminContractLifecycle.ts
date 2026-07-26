import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminContractLifecycle2026072600000 implements MigrationInterface {
  name = 'AdminContractLifecycle2026072600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "notifications_type_enum"
      ADD VALUE IF NOT EXISTS 'COMPLAINT_RESPONSE'
    `);
    await queryRunner.query(`
      ALTER TYPE "notifications_type_enum"
      ADD VALUE IF NOT EXISTS 'CONTRACT_UPDATE'
    `);
    for (const status of [
      'AWAITING_CUSTOMER_CONFIRMATION',
      'DELIVERY_IN_PROGRESS',
      'CANCELLATION_REQUESTED',
      'DISPUTED',
    ]) {
      await queryRunner.query(`
        ALTER TYPE "contracts_status_enum" ADD VALUE IF NOT EXISTS '${status}'
      `);
    }
    await queryRunner.query(`
      ALTER TYPE "contract_signatures_signaturetype_enum"
      ADD VALUE IF NOT EXISTS 'PROVIDER_COMPLETION'
    `);
    for (const kind of [
      'CONTRACT_PROVIDER_COMPLETED',
      'CONTRACT_DELIVERY_STARTED',
      'CONTRACT_CANCELLATION_REQUESTED',
      'CONTRACT_DISPUTED',
      'CONTRACT_CANCELLED',
    ]) {
      await queryRunner.query(`
        ALTER TYPE "messages_kind_enum" ADD VALUE IF NOT EXISTS '${kind}'
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "settings"
      ADD COLUMN IF NOT EXISTS "completionConfirmationGraceHours" integer NOT NULL DEFAULT 24
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notifications_recipienttype_enum" AS ENUM ('USER', 'PROVIDER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD COLUMN IF NOT EXISTS "recipientId" uuid,
      ADD COLUMN IF NOT EXISTS "recipientType" "notifications_recipienttype_enum" NOT NULL DEFAULT 'USER'
    `);
    await queryRunner.query(`
      UPDATE "notifications"
      SET "recipientId" = "userId"
      WHERE "recipientId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "recipientId" SET NOT NULL,
      ALTER COLUMN "userId" DROP NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_recipient"
      ON "notifications" ("recipientId", "recipientType", "createdAt")
    `);
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS "undertakingTextAr" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "undertakingTextEn" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "undertakingEnabled" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "refundPolicyAr" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "refundPolicyEn" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "refundPolicyEnabled" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "contracts"
      ADD COLUMN IF NOT EXISTS "undertakingTextAr" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "undertakingTextEn" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "refundPolicyAr" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "refundPolicyEn" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "cancellationReason" text,
      ADD COLUMN IF NOT EXISTS "disputeReason" text,
      ADD COLUMN IF NOT EXISTS "paidAt" timestamptz,
      ADD COLUMN IF NOT EXISTS "providerCompletedAt" timestamptz,
      ADD COLUMN IF NOT EXISTS "deliveryStartedAt" timestamptz,
      ADD COLUMN IF NOT EXISTS "deliveryEstimateDays" integer,
      ADD COLUMN IF NOT EXISTS "confirmationDeadlineAt" timestamptz,
      ADD COLUMN IF NOT EXISTS "cancellationRequestedAt" timestamptz,
      ADD COLUMN IF NOT EXISTS "disputedAt" timestamptz,
      ADD COLUMN IF NOT EXISTS "completedAt" timestamptz,
      ADD COLUMN IF NOT EXISTS "cancelledAt" timestamptz
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_settlements_type_enum" AS ENUM
          ('HOLD', 'CUSTOMER_REFUND', 'PROVIDER_RELEASE', 'PLATFORM_COMMISSION', 'VAT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contract_settlements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "contractId" uuid NOT NULL,
        "paymentId" uuid NOT NULL,
        "type" "contract_settlements_type_enum" NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "idempotencyKey" varchar(255) NOT NULL,
        "reason" text,
        "createdById" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contract_settlements" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_contract_settlements_key" UNIQUE ("idempotencyKey"),
        CONSTRAINT "FK_contract_settlements_contract"
          FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_audits_actortype_enum" AS ENUM
          ('USER', 'PROVIDER', 'ADMIN', 'SYSTEM');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_audits_action_enum" AS ENUM
          ('CONTRACT_CREATED', 'CONTRACT_RESENT', 'CONTRACT_ACCEPTED',
           'CONTRACT_REJECTED', 'PAYMENT_COMPLETED', 'PROVIDER_COMPLETED',
           'DELIVERY_STARTED', 'CUSTOMER_COMPLETED',
           'CANCELLATION_REQUESTED', 'DELIVERY_REFUSED', 'DISPUTE_REFUNDED',
           'DISPUTE_RELEASED', 'TIMEOUT_COMPLETED', 'TIMEOUT_CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_audits_previousstatus_enum" AS ENUM
          ('DRAFT','PENDING','ACCEPTED','REJECTED','IN_PROGRESS',
           'AWAITING_CUSTOMER_CONFIRMATION','DELIVERY_IN_PROGRESS',
           'CANCELLATION_REQUESTED','DISPUTED','COMPLETED','CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_audits_newstatus_enum" AS ENUM
          ('DRAFT','PENDING','ACCEPTED','REJECTED','IN_PROGRESS',
           'AWAITING_CUSTOMER_CONFIRMATION','DELIVERY_IN_PROGRESS',
           'CANCELLATION_REQUESTED','DISPUTED','COMPLETED','CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contract_audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "contractId" uuid NOT NULL,
        "actorId" uuid NOT NULL,
        "actorType" "contract_audits_actortype_enum" NOT NULL,
        "action" "contract_audits_action_enum" NOT NULL,
        "previousStatus" "contract_audits_previousstatus_enum" NOT NULL,
        "newStatus" "contract_audits_newstatus_enum" NOT NULL,
        "reason" text,
        "metadata" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contract_audits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contract_audits_contract"
          FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contract_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "contractId" uuid NOT NULL,
        "version" integer NOT NULL,
        "path" text NOT NULL,
        "sha256" varchar(64) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contract_documents" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_contract_documents_contract" UNIQUE ("contractId"),
        CONSTRAINT "FK_contract_documents_contract"
          FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE
      )
    `);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'AdminContractLifecycle cannot be rolled back safely after lifecycle records exist.',
      ),
    );
  }
}
