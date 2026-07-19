import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ContractQuote {
  @Field(() => Float)
  agreedPrice: number;

  @Field(() => Float)
  depositPercent: number;

  @Field(() => Float)
  downPayment: number;

  @Field(() => Float)
  commissionPercent: number;

  @Field(() => Float)
  commissionAmount: number;

  @Field(() => Float)
  vatRate: number;

  @Field(() => Float)
  vatAmount: number;

  @Field(() => Float)
  totalPayable: number;

  @Field(() => Float)
  providerNetAmount: number;

  @Field()
  contractDocumentText: string;

  @Field(() => Int, { nullable: true })
  maxCompletionDays: number | null;

  @Field(() => Int, { nullable: true })
  maxTerminationDays: number | null;
}
