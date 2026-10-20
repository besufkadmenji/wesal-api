import type { Category } from './entities/category.entity';

/** [value field, enable flag, smallest allowed value when enabled] */
export const CONTRACT_VALUE_FIELDS = [
  ['commissionPercent', 'commissionEnabled', 1],
  ['minCommissionAmount', 'minCommissionEnabled', 0],
  ['depositPercent', 'depositEnabled', 1],
  ['maxExecutionHours', 'maxExecutionHoursEnabled', 1],
  ['maxTerminationHours', 'maxTerminationHoursEnabled', 1],
  ['customerConversationFee', 'customerConversationFeeEnabled', 1],
  ['providerConversationFee', 'providerConversationFeeEnabled', 1],
] as const satisfies ReadonlyArray<
  readonly [keyof Category, keyof Category, number]
>;

/** [enable flag, text fields that must be non-empty when enabled] */
export const CONTRACT_TEXT_FIELDS = [
  ['contractDocumentEnabled', ['contractDocumentText']],
  ['undertakingEnabled', ['undertakingTextAr', 'undertakingTextEn']],
  ['refundPolicyEnabled', ['refundPolicyAr', 'refundPolicyEn']],
] as const satisfies ReadonlyArray<
  readonly [keyof Category, ReadonlyArray<keyof Category>]
>;

export type ContractControlProblem =
  { kind: 'value'; field: string } | { kind: 'text'; field: string };

/**
 * BRD 4.3.8: every enabled contract value is a whole number (≥ 1, or ≥ 0 for
 * the minimum commission) and every enabled text is non-empty. Disabled
 * fields are ignored — "disabled" turns the feature off for the category.
 */
export const findContractControlProblem = (
  category: Partial<Category>,
): ContractControlProblem | null => {
  for (const [field, flag, min] of CONTRACT_VALUE_FIELDS) {
    if (!category[flag]) continue;
    const value = category[field];
    if (
      value === null ||
      value === undefined ||
      !Number.isInteger(Number(value)) ||
      Number(value) < min
    ) {
      return { kind: 'value', field };
    }
  }
  for (const [flag, fields] of CONTRACT_TEXT_FIELDS) {
    if (!category[flag]) continue;
    for (const field of fields) {
      const text = category[field] as string | null | undefined;
      if (!text?.trim()) return { kind: 'text', field };
    }
  }
  return null;
};
