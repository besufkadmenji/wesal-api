import { EntityManager } from 'typeorm';

/**
 * BRD 4.1.16 / 4.1.18: a contract deleted before payment returns its number
 * "to the cycle". Numbers come from public_id_seq (shared by every table), so
 * freed contract numbers wait here for the next contract. Call inside the
 * caller's transaction.
 */
export const CONTRACT_NUMBER_POOL = 'contract_number_pool';

export const releaseContractNumbers = async (
  manager: EntityManager,
  numbers: Array<number | string | null | undefined>,
): Promise<void> => {
  const values = numbers
    .filter((number) => number !== null && number !== undefined)
    .map(Number);
  if (values.length === 0) return;
  await manager.query(
    `INSERT INTO "${CONTRACT_NUMBER_POOL}" ("number")
     SELECT UNNEST($1::bigint[])
     ON CONFLICT ("number") DO NOTHING`,
    [values],
  );
};

/** The smallest released number, removed from the pool; null when empty. */
export const claimContractNumber = async (
  manager: EntityManager,
): Promise<number | null> => {
  const result: unknown = await manager.query(
    `DELETE FROM "${CONTRACT_NUMBER_POOL}"
     WHERE "number" = (
       SELECT "number" FROM "${CONTRACT_NUMBER_POOL}"
       ORDER BY "number" LIMIT 1 FOR UPDATE SKIP LOCKED
     )
     RETURNING "number"`,
  );
  // TypeORM's postgres driver returns [rows, count] for DELETE … RETURNING.
  const rows = (
    Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result
  ) as Array<{ number: string }>;
  return rows.length ? Number(rows[0].number) : null;
};
