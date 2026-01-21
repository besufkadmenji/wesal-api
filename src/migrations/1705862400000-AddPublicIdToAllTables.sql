-- Create sequence for public IDs starting from 100000
CREATE SEQUENCE IF NOT EXISTS public_id_seq START 100000 INCREMENT 1;

-- ============ USERS TABLE ============
ALTER TABLE users ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE users SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE users ADD CONSTRAINT users_public_id_unique UNIQUE ("publicId");
ALTER TABLE users ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_public_id ON users("publicId");

-- ============ ADVERTISEMENTS TABLE ============
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE advertisements SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE advertisements ADD CONSTRAINT advertisements_public_id_unique UNIQUE ("publicId");
ALTER TABLE advertisements ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_advertisements_public_id ON advertisements("publicId");

-- ============ CATEGORIES TABLE ============
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE categories SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE categories ADD CONSTRAINT categories_public_id_unique UNIQUE ("publicId");
ALTER TABLE categories ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_public_id ON categories("publicId");

-- ============ ADMINS TABLE ============
ALTER TABLE admins ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE admins SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE admins ADD CONSTRAINT admins_public_id_unique UNIQUE ("publicId");
ALTER TABLE admins ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_public_id ON admins("publicId");

-- ============ COUNTRIES TABLE ============
ALTER TABLE countries ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE countries SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE countries ADD CONSTRAINT countries_public_id_unique UNIQUE ("publicId");
ALTER TABLE countries ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_countries_public_id ON countries("publicId");

-- ============ CITIES TABLE ============
ALTER TABLE cities ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE cities SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE cities ADD CONSTRAINT cities_public_id_unique UNIQUE ("publicId");
ALTER TABLE cities ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cities_public_id ON cities("publicId");

-- ============ CONTRACTS TABLE ============
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE contracts SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE contracts ADD CONSTRAINT contracts_public_id_unique UNIQUE ("publicId");
ALTER TABLE contracts ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_public_id ON contracts("publicId");

-- ============ PAYMENTS TABLE ============
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE payments SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE payments ADD CONSTRAINT payments_public_id_unique UNIQUE ("publicId");
ALTER TABLE payments ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_public_id ON payments("publicId");

-- ============ FAVORITES TABLE ============
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE favorites SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE favorites ADD CONSTRAINT favorites_public_id_unique UNIQUE ("publicId");
ALTER TABLE favorites ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_public_id ON favorites("publicId");

-- ============ RATINGS TABLE ============
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE ratings SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE ratings ADD CONSTRAINT ratings_public_id_unique UNIQUE ("publicId");
ALTER TABLE ratings ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ratings_public_id ON ratings("publicId");

-- ============ COMPLAINTS TABLE ============
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE complaints SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE complaints ADD CONSTRAINT complaints_public_id_unique UNIQUE ("publicId");
ALTER TABLE complaints ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_complaints_public_id ON complaints("publicId");

-- ============ CONVERSATIONS TABLE ============
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE conversations SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE conversations ADD CONSTRAINT conversations_public_id_unique UNIQUE ("publicId");
ALTER TABLE conversations ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_public_id ON conversations("publicId");

-- ============ MESSAGES TABLE ============
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE messages SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE messages ADD CONSTRAINT messages_public_id_unique UNIQUE ("publicId");
ALTER TABLE messages ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_public_id ON messages("publicId");

-- ============ CONTACT_MESSAGES TABLE ============
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE contact_messages SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE contact_messages ADD CONSTRAINT contact_messages_public_id_unique UNIQUE ("publicId");
ALTER TABLE contact_messages ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_messages_public_id ON contact_messages("publicId");

-- ============ NOTIFICATIONS TABLE ============
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE notifications SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE notifications ADD CONSTRAINT notifications_public_id_unique UNIQUE ("publicId");
ALTER TABLE notifications ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_public_id ON notifications("publicId");

-- ============ PERMISSIONS TABLE ============
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE permissions SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE permissions ADD CONSTRAINT permissions_public_id_unique UNIQUE ("publicId");
ALTER TABLE permissions ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_permissions_public_id ON permissions("publicId");

-- ============ ADMIN_PERMISSIONS TABLE ============
ALTER TABLE admin_permissions ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE admin_permissions SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE admin_permissions ADD CONSTRAINT admin_permissions_public_id_unique UNIQUE ("publicId");
ALTER TABLE admin_permissions ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_permissions_public_id ON admin_permissions("publicId");

-- ============ SETTINGS TABLE ============
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE settings SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE settings ADD CONSTRAINT settings_public_id_unique UNIQUE ("publicId");
ALTER TABLE settings ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_settings_public_id ON settings("publicId");

-- ============ FAQS TABLE ============
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE faqs SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE faqs ADD CONSTRAINT faqs_public_id_unique UNIQUE ("publicId");
ALTER TABLE faqs ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faqs_public_id ON faqs("publicId");

-- ============ SIGNED_CONTRACTS TABLE ============
ALTER TABLE signed_contracts ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE signed_contracts SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE signed_contracts ADD CONSTRAINT signed_contracts_public_id_unique UNIQUE ("publicId");
ALTER TABLE signed_contracts ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signed_contracts_public_id ON signed_contracts("publicId");

-- ============ ADVERTISEMENT_MEDIA TABLE ============
ALTER TABLE advertisement_media ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE advertisement_media SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE advertisement_media ADD CONSTRAINT advertisement_media_public_id_unique UNIQUE ("publicId");
ALTER TABLE advertisement_media ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_advertisement_media_public_id ON advertisement_media("publicId");

-- ============ ADVERTISEMENT_ATTRIBUTES TABLE ============
ALTER TABLE advertisement_attributes ADD COLUMN IF NOT EXISTS "publicId" BIGINT;
UPDATE advertisement_attributes SET "publicId" = nextval('public_id_seq') WHERE "publicId" IS NULL;
ALTER TABLE advertisement_attributes ADD CONSTRAINT advertisement_attributes_public_id_unique UNIQUE ("publicId");
ALTER TABLE advertisement_attributes ALTER COLUMN "publicId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_advertisement_attributes_public_id ON advertisement_attributes("publicId");
