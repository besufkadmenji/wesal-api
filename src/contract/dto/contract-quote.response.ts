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

  @Field({
    description:
      'Wesal Al-Khair: the commission is at or below the category minimum, so it is donated instead of kept by the platform',
  })
  isCharity: boolean;

  @Field(() => Float, {
    description:
      'Commission set aside for donation on a charity contract (0 otherwise)',
  })
  charityAmount: number;

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
  maxExecutionHours: number | null;

  @Field(() => Int, { nullable: true })
  maxTerminationHours: number | null;
}
