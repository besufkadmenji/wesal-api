import { MigrationInterface, QueryRunner } from 'typeorm';

const ADMIN_TYPES = [
  'ADMIN_NEW_CUSTOMER',
  'ADMIN_PROVIDER_REQUEST',
  'ADMIN_PAYMENT',
  'ADMIN_CONTACT_MESSAGE',
  'ADMIN_CONTRACT_CREATED',
  'ADMIN_CONTRACT_STATUS',
  'ADMIN_COMPLAINT',
  'ADMIN_BADGE_UNDER_IMPROVEMENT',
  'ADMIN_BADGE_DELETED',
];

const TYPES_BEFORE = `'NEW_MESSAGE', 'CONTRACT_CREATED', 'CONTRACT_SIGNED', 'CONTRACT_UPDATE', 'PAYMENT_RECEIVED', 'PAYMENT_COMPLETED', 'LISTING_APPROVED', 'LISTING_REJECTED', 'NEW_RATING', 'BADGE_CHANGED', 'BADGE_WARNING', 'COMPLAINT_SUBMITTED', 'COMPLAINT_RESPONSE', 'COMPLAINT_RESOLVED', 'SYSTEM_ANNOUNCEMENT'`;

/**
 * Sprint 4 admin notifications (BRD 4.3.24 / 4.3.25): broadcast history,
 * admins as notification recipients, admin event types, and an English copy
 * of notification text. Names match TypeORM's default naming strategy.
 */
export class AdminNotifications2026101800100 implements MigrationInterface {
  name = 'AdminNotifications2026101800100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notification_broadcasts_recipienttypes_enum" AS ENUM('USER', 'PROVIDER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_broadcasts_audience_enum" AS ENUM('ALL', 'SELECTED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "notification_broadcasts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "publicId" bigint DEFAULT nextval('public_id_seq'),
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "recipientTypes" "public"."notification_broadcasts_recipienttypes_enum" array NOT NULL,
        "audience" "public"."notification_broadcasts_audience_enum" NOT NULL,
        "recipients" jsonb,
        "recipientCount" integer NOT NULL DEFAULT '0',
        "createdByAdminId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_43840c7d4417cfa52ddd298a66f" UNIQUE ("publicId"),
        CONSTRAINT "PK_6f7c083e6995cac3a6cd4609125" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "translations" jsonb`,
    );

    // Appending enum values avoids rewriting the notifications table.
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_recipienttype_enum" ADD VALUE IF NOT EXISTS 'ADMIN'`,
    );
    for (const type of ADMIN_TYPES) {
      await queryRunner.query(
        `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS '${type}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "recipientType" = 'ADMIN' OR "type"::text LIKE 'ADMIN\\_%'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM(${TYPES_BEFORE})`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);

    await queryRunner.query(
      `ALTER TYPE "public"."notifications_recipienttype_enum" RENAME TO "notifications_recipienttype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_recipienttype_enum" AS ENUM('USER', 'PROVIDER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "recipientType" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "recipientType" TYPE "public"."notifications_recipienttype_enum" USING "recipientType"::"text"::"public"."notifications_recipienttype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "recipientType" SET DEFAULT 'USER'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notifications_recipienttype_enum_old"`,
    );

    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "translations"`,
    );
    await queryRunner.query(`DROP TABLE "notification_broadcasts"`);
    await queryRunner.query(
      `DROP TYPE "public"."notification_broadcasts_audience_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notification_broadcasts_recipienttypes_enum"`,
    );
  }
}
