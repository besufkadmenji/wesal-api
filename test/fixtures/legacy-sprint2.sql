CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SEQUENCE IF NOT EXISTS public_id_seq START 1000;

CREATE TYPE listings_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE listings_type_enum AS ENUM ('FREE', 'FEATURED');
CREATE TYPE complaints_reason_enum AS ENUM ('FRAUD', 'OTHER');
CREATE TYPE complaints_status_enum AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED');
CREATE TYPE payments_paymentmethod_enum AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'BANK_TRANSFER', 'WALLET');

CREATE TABLE users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  address text,
  latitude numeric(10,8),
  longitude numeric(11,8)
);
CREATE TABLE providers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  "commercialName" text,
  phone text,
  address text,
  latitude numeric(10,8),
  longitude numeric(11,8)
);
CREATE TABLE admins (id uuid PRIMARY KEY);
CREATE TABLE categories (
  id uuid PRIMARY KEY,
  "rulesEn" text NOT NULL DEFAULT '',
  "rulesAr" text NOT NULL DEFAULT '',
  "conversationFee" numeric(10,2)
);
CREATE TABLE settings (
  id uuid PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE listings (
  id uuid PRIMARY KEY,
  "providerId" uuid NOT NULL REFERENCES providers(id),
  "categoryId" uuid NOT NULL REFERENCES categories(id),
  name text NOT NULL,
  status listings_status_enum NOT NULL DEFAULT 'ACTIVE',
  type listings_type_enum NOT NULL DEFAULT 'FREE',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE conversations (
  id uuid PRIMARY KEY,
  "listingId" uuid NOT NULL REFERENCES listings(id),
  "userId" uuid NOT NULL REFERENCES users(id),
  "providerId" uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  "isPaid" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE messages (
  id uuid PRIMARY KEY,
  "conversationId" uuid NOT NULL REFERENCES conversations(id),
  "senderId" uuid NOT NULL,
  content text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE contracts (
  id uuid PRIMARY KEY,
  "conversationId" uuid NOT NULL REFERENCES conversations(id),
  "clientId" uuid NOT NULL REFERENCES users(id),
  "providerId" uuid NOT NULL REFERENCES providers(id),
  "agreedPrice" numeric(10,2) NOT NULL,
  "downPayment" numeric(10,2) NOT NULL DEFAULT 0,
  status varchar(30) NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE contract_signatures (
  id uuid PRIMARY KEY,
  "contractId" uuid NOT NULL REFERENCES contracts(id),
  "signatureData" text NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payments (
  id uuid PRIMARY KEY,
  "contractId" uuid NOT NULL REFERENCES contracts(id),
  "userId" uuid NOT NULL REFERENCES users(id),
  amount numeric(10,2) NOT NULL,
  "paymentMethod" payments_paymentmethod_enum NOT NULL DEFAULT 'CREDIT_CARD',
  status varchar(30) NOT NULL DEFAULT 'COMPLETED',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE favorites (
  id uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES users(id),
  "listingId" uuid NOT NULL REFERENCES listings(id),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_legacy_favorite" UNIQUE ("userId", "listingId")
);
CREATE TABLE complaints (
  id uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES users(id),
  "listingId" uuid NOT NULL REFERENCES listings(id),
  reason complaints_reason_enum NOT NULL,
  description text NOT NULL,
  status complaints_status_enum NOT NULL DEFAULT 'PENDING',
  "reviewedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE permissions (
  id uuid PRIMARY KEY,
  "publicId" bigint UNIQUE DEFAULT nextval('public_id_seq'),
  name varchar(255) NOT NULL,
  "nameAr" varchar(255) NOT NULL,
  description text NOT NULL,
  module varchar(100) NOT NULL,
  action varchar(100) NOT NULL,
  resource varchar(100) NOT NULL,
  "permissionPlatform" varchar(20) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_permission_module_action_resource" UNIQUE (module, action, resource)
);

INSERT INTO users VALUES
  ('10000000-0000-4000-8000-000000000001', 'Legacy Customer', 'Customer address', 24.7136, 46.6753);
INSERT INTO providers VALUES
  ('20000000-0000-4000-8000-000000000001', 'Legacy Provider', 'Legacy Co', '+966500000001', 'Provider address', 24.7136, 46.6753);
INSERT INTO categories (id, "rulesEn", "rulesAr", "conversationFee") VALUES
  ('30000000-0000-4000-8000-000000000001', 'Legacy rules', 'شروط قديمة', 20);
INSERT INTO settings (id) VALUES ('00000000-0000-0000-0000-000000000000');
INSERT INTO listings (id, "providerId", "categoryId", name, type) VALUES
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Legacy listing', 'FREE');
INSERT INTO conversations (id, "listingId", "userId", "providerId", "isPaid") VALUES
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', true);
INSERT INTO messages (id, "conversationId", "senderId", content) VALUES
  ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Email me at legacy@example.com or call +966 50 000 0001');
INSERT INTO contracts (id, "conversationId", "clientId", "providerId", "agreedPrice", "downPayment", status) VALUES
  ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 500, 50, 'ACCEPTED');
INSERT INTO payments (id, "contractId", "userId", amount) VALUES
  ('80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 500);
INSERT INTO favorites (id, "userId", "listingId") VALUES
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001');
INSERT INTO complaints (id, "userId", "listingId", reason, description) VALUES
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'OTHER', 'Legacy complaint details');
