import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

/** Admin Wesal Al-Khair totals (BRD 4.3.11; PO 2026-10-18: donated manually via Ihsan). */
@ObjectType()
export class CharitySummary {
  @Field(() => Int, { description: 'All charity contracts in the period' })
  contracts: number;

  @Field(() => Int, { description: 'Completed charity contracts' })
  completedContracts: number;

  @Field(() => Float, {
    description:
      'Commission collected on completed charity contracts: the amount to donate (SAR)',
  })
  totalAmount: number;
}
