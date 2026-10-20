import { Field, Int, ObjectType } from '@nestjs/graphql';

/** Values and texts a new category starts with (BRD 4.3.8 / 4.3.17). */
@ObjectType()
export class CategoryContractDefaults {
  @Field(() => Int)
  commissionPercent: number;

  @Field(() => Int)
  minCommissionAmount: number;

  @Field(() => Int)
  depositPercent: number;

  @Field(() => Int)
  maxExecutionHours: number;

  @Field(() => Int)
  maxTerminationHours: number;

  @Field(() => Int)
  customerConversationFee: number;

  @Field(() => Int)
  providerConversationFee: number;

  @Field()
  contractDocumentText: string;

  @Field()
  undertakingTextAr: string;

  @Field()
  undertakingTextEn: string;

  @Field()
  refundPolicyAr: string;

  @Field()
  refundPolicyEn: string;
}
