Enum "advertisement_status" {
    "DRAFT"
    "PUBLISHED"
    "SUSPENDED"
    "EXPIRED"
}

Enum "complaint_status" {
    "OPEN"
    "UNDER_REVIEW"
    "RESOLVED"
    "REJECTED"
}

Enum "contract_status" {
    "PENDING"
    "ACCEPTED"
    "REJECTED"
    "IN_PROGRESS"
    "COMPLETED"
    "CANCELLED"
}

Enum "payment_status" {
    "PENDING"
    "PAID"
    "FAILED"
    "REFUNDED"
}

Enum "user_role" {
    "USER"
    "PROVIDER"
    "ADMIN"
    "SUPPORT"
}

Table "advertisement_attributes" {
  "id" uuid [pk, not null]
  "advertisementId" uuid [not null, ref: < "advertisements"."id"]
  "key" varchar(500) [not null]
  "value" varchar(500) [not null]
}

Table "users" {
  "id" uuid [pk, not null, ref: < "user_profiles"."userId"]
  "phone" varchar(500) [unique, not null]
  "email" varchar(500) [unique, not null]
  "passwordHash" varchar(500) [not null]
  "role" user_role [not null]
  "isActive" boolean [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "countries" {
  "id" uuid [pk, not null]
  "code" varchar(500) [unique, not null]
  "name" varchar(500) [not null]
}

Table "messages" {
  "id" uuid [pk, not null]
  "conversationId" uuid [not null, ref: < "conversations"."id"]
  "senderId" uuid [not null, ref: < "users"."id"]
  "content" text [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "advertisement_media" {
  "id" uuid [pk, not null]
  "advertisementId" uuid [not null, ref: < "advertisements"."id"]
  "url" varchar(500) [not null]
  "sortOrder" int [not null]
}

Table "favorites" {
  "id" uuid [pk, not null]
  "userId" uuid [not null, ref: < "users"."id"]
  "advertisementId" uuid [not null, ref: < "advertisements"."id"]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "user_profiles" {
  "id" uuid [pk, not null]
  "userId" uuid [unique, not null]
  "fullName" varchar(500) [not null]
  "avatarUrl" varchar(500) [not null]
  "countryId" uuid [not null]
  "cityId" uuid [not null]
  "languageCode" varchar(500) [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "contract_signatures" {
  "id" uuid [pk, not null]
  "contractIId" uuid [not null, ref: < "contracts"."id"]
  "userId" uuid [not null, ref: < "users"."id"]
  "signatureData" text [not null]
  "signedAt" timestamp [not null]
}

Table "category_translations" {
  "id" uuid [pk, not null]
  "categoryId" uuid [not null, ref: < "categories"."id"]
  "languageCode" varchar(500) [not null]
  "name" varchar(500) [not null]
  "description" text [not null]
}

Table "conversations" {
  "id" uuid [pk, not null]
  "advertisementId" uuid [not null, ref: < "advertisements"."id"]
  "userId" uuid [not null, ref: < "users"."id"]
  "providerId" uuid [not null, ref: < "users"."id"]
  "isPaid" boolean [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamptz [not null]
}

Table "cities" {
  "id" uuid [pk, not null]
  "countryId" uuid [not null, ref: < "countries"."id"]
  "name" varchar(500) [not null]
}

Table "contracts" {
  "id" uuid [pk, not null]
  "conversationId" uuid [not null, ref: < "conversations"."id"]
  "clientId" uuid [not null, ref: < "users"."id"]
  "providerId" uuid [not null, ref: < "users"."id"]
  "agreedPrice" decimal [not null]
  "downPayment" decimal [not null]
  "status" contract_status [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "payments" {
  "id" uuid [pk, not null]
  "userId" uuid [not null, ref: < "users"."id"]
  "contractId" uuid [not null, ref: < "contracts"."id"]
  "conversationId" uuid [not null, ref: < "conversations"."id"]
  "amount" decimal [not null]
  "status" payment_status [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "advertisements" {
  "id" uuid [pk, not null]
  "userId" uuid [not null, ref: < "users"."id"]
  "categoryId" uuid [not null, ref: < "categories"."id"]
  "title" varchar(500) [not null]
  "description" text [not null]
  "price" decimal [not null]
  "cityId" uuid [not null, ref: < "cities"."id"]
  "status" advertisement_status [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "categories" {
  "id" uuid [pk, not null]
  "parentId" uuid [ref: < "categories"."id"]
  "slug" varchar(500) [unique, not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "complaints" {
  "id" uuid [pk, not null]
  "userId" uuid [not null, ref: < "users"."id"]
  "contractId" uuid [not null, ref: < "contracts"."id"]
  "description" text [not null]
  "status" complaint_status [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "notifications" {
  "id" uuid [pk, not null]
  "userId" uuid [not null, ref: < "users"."id"]
  "title" varchar(500) [not null]
  "body" text [not null]
  "isRead" boolean [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}

Table "ratings" {
  "id" uuid [pk, not null]
  "fromUserId" uuid [not null, ref: < "users"."id"]
  "toUserId" uuid [not null, ref: < "users"."id"]
  "contractId" uuid [not null, ref: < "contracts"."id"]
  "score" int [not null]
  "comment" text [not null]
  "createdAt" timestamp [not null]
  "updatedAt" timestamp [not null]
}
