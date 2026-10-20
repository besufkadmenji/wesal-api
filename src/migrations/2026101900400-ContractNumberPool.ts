import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * D-13 (decision 2026-10-19, BRD 4.1.16 / 4.1.18): a contract cancelled before
 * payment is removed from the system and its number returns to the cycle.
 *
 * - Creates contract_number_pool (freed numbers, reused smallest first).
 * - One-time cleanup: every CANCELLED contract that was never paid, with the
 *   unpaid versions it superseded, is deleted (signatures, audits and
 *   documents cascade); complaints and notifications pointing at it are
 *   unlinked; its numbers go to the pool.
 *
 * IRREVERSIBLE: down only drops the pool; deleted contracts can't return.
 */
export class ContractNumberPool2026101900400 implements MigrationInterface {
  name = 'ContractNumberPool2026101900400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contract_number_pool" (
        "number" bigint NOT NULL,
        "releasedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contract_number_pool" PRIMARY KEY ("number")
      )`,
    );
    await queryRunner.query(
      `CREATE TEMP TABLE "removed_contracts" ON COMMIT DROP AS
       WITH RECURSIVE chain AS (
         SELECT c."id", c."publicId", c."supersedesContractId"
         FROM "contracts" c
         WHERE c."status" = 'CANCELLED' AND c."paidAt" IS NULL
         UNION
         SELECT p."id", p."publicId", p."supersedesContractId"
         FROM "contracts" p
         JOIN chain ON p."id" = chain."supersedesContractId"
         WHERE p."paidAt" IS NULL
       )
       SELECT chain."id", chain."publicId" FROM chain
       WHERE NOT EXISTS (SELECT 1 FROM "payments" x WHERE x."contractId" = chain."id")
         AND NOT EXISTS (SELECT 1 FROM "ratings" r WHERE r."contractId" = chain."id")`,
    );
    await queryRunner.query(
      `UPDATE "complaints" SET "contractId" = NULL
       WHERE "contractId" IN (SELECT "id" FROM "removed_contracts")`,
    );
    await queryRunner.query(
      `UPDATE "notifications" SET "relatedEntityId" = NULL
       WHERE "relatedEntityType" = 'contract'
         AND "relatedEntityId" IN (SELECT "id" FROM "removed_contracts")`,
    );
    await queryRunner.query(
      `INSERT INTO "contract_number_pool" ("number")
       SELECT "publicId" FROM "removed_contracts" WHERE "publicId" IS NOT NULL
       ON CONFLICT ("number") DO NOTHING`,
    );
    await queryRunner.query(
      `DELETE FROM "contracts" WHERE "id" IN (SELECT "id" FROM "removed_contracts")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contract_number_pool"`);
  }
}
