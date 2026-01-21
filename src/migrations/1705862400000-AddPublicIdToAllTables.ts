import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicIdToAllTables1705862400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sequence for public IDs starting from 100000
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS public_id_seq START 100000 INCREMENT 1;
    `);

    // Add publicId column to users table
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_public_id ON users("publicId");
    `);

    // Add publicId to advertisements
    await queryRunner.query(`
      ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_advertisements_public_id ON advertisements("publicId");
    `);

    // Add publicId to categories
    await queryRunner.query(`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_public_id ON categories("publicId");
    `);

    // Add publicId to admins
    await queryRunner.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_admins_public_id ON admins("publicId");
    `);

    // Add publicId to countries
    await queryRunner.query(`
      ALTER TABLE countries ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_countries_public_id ON countries("publicId");
    `);

    // Add publicId to cities
    await queryRunner.query(`
      ALTER TABLE cities ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cities_public_id ON cities("publicId");
    `);

    // Add publicId to contracts
    await queryRunner.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_public_id ON contracts("publicId");
    `);

    // Add publicId to payments
    await queryRunner.query(`
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_public_id ON payments("publicId");
    `);

    // Add publicId to favorites
    await queryRunner.query(`
      ALTER TABLE favorites ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_favorites_public_id ON favorites("publicId");
    `);

    // Add publicId to ratings
    await queryRunner.query(`
      ALTER TABLE ratings ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ratings_public_id ON ratings("publicId");
    `);

    // Add publicId to complaints
    await queryRunner.query(`
      ALTER TABLE complaints ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_public_id ON complaints("publicId");
    `);

    // Add publicId to conversations
    await queryRunner.query(`
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_public_id ON conversations("publicId");
    `);

    // Add publicId to messages
    await queryRunner.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_public_id ON messages("publicId");
    `);

    // Add publicId to contact_messages
    await queryRunner.query(`
      ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_messages_public_id ON contact_messages("publicId");
    `);

    // Add publicId to notifications
    await queryRunner.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_public_id ON notifications("publicId");
    `);

    // Add publicId to permissions
    await queryRunner.query(`
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_permissions_public_id ON permissions("publicId");
    `);

    // Add publicId to admin_permissions
    await queryRunner.query(`
      ALTER TABLE admin_permissions ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_permissions_public_id ON admin_permissions("publicId");
    `);

    // Add publicId to settings
    await queryRunner.query(`
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_settings_public_id ON settings("publicId");
    `);

    // Add publicId to faqs
    await queryRunner.query(`
      ALTER TABLE faqs ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_faqs_public_id ON faqs("publicId");
    `);

    // Add publicId to signed_contracts
    await queryRunner.query(`
      ALTER TABLE signed_contracts ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_signed_contracts_public_id ON signed_contracts("publicId");
    `);

    // Add publicId to advertisement_media
    await queryRunner.query(`
      ALTER TABLE advertisement_media ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_advertisement_media_public_id ON advertisement_media("publicId");
    `);

    // Add publicId to advertisement_attributes
    await queryRunner.query(`
      ALTER TABLE advertisement_attributes ADD COLUMN IF NOT EXISTS "publicId" BIGINT UNIQUE DEFAULT nextval('public_id_seq');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_advertisement_attributes_public_id ON advertisement_attributes("publicId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indices
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_public_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_advertisements_public_id`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_admins_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_countries_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cities_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contracts_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_favorites_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ratings_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_complaints_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_conversations_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_public_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_contact_messages_public_id`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_permissions_public_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_admin_permissions_public_id`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_settings_public_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_faqs_public_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_signed_contracts_public_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_advertisement_media_public_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_advertisement_attributes_public_id`,
    );

    // Drop columns
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE advertisements DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE categories DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE admins DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE countries DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE cities DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE contracts DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE payments DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE favorites DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE ratings DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE complaints DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE conversations DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE messages DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE contact_messages DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE notifications DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE permissions DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE admin_permissions DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE settings DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE faqs DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE signed_contracts DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE advertisement_media DROP COLUMN IF EXISTS "publicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE advertisement_attributes DROP COLUMN IF EXISTS "publicId"`,
    );

    // Drop sequence
    await queryRunner.query(`DROP SEQUENCE IF EXISTS public_id_seq`);
  }
}
