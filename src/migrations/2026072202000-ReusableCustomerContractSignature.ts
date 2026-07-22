import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReusableCustomerContractSignature2026072202000
  implements MigrationInterface
{
  name = 'ReusableCustomerContractSignature2026072202000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "contractSignature" character varying(500)
    `);
    await queryRunner.query(`
      UPDATE "users" AS "user"
      SET "contractSignature" = "existingSignature"."signatureData"
      FROM (
        SELECT DISTINCT ON ("contract"."clientId")
          "contract"."clientId",
          "signature"."signatureData"
        FROM "contract_signatures" AS "signature"
        INNER JOIN "contracts" AS "contract"
          ON "contract"."id" = "signature"."contractId"
        WHERE "signature"."signatureType" = 'CUSTOMER_ACCEPTANCE'
        ORDER BY "contract"."clientId", "signature"."signedAt" ASC
      ) AS "existingSignature"
      WHERE "user"."id" = "existingSignature"."clientId"
        AND "user"."contractSignature" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "contractSignature"
    `);
  }
}
