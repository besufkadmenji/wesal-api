import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ConversationFeeReportRow {
  @Field()
  paymentId: string;
  @Field()
  conversationId: string;
  @Field(() => String, { nullable: true })
  customerName: string | null;
  @Field(() => String, { nullable: true })
  providerName: string | null;
  @Field()
  status: string;
  @Field(() => Float)
  customerFee: number;
  @Field(() => Float)
  providerFee: number;
  @Field()
  createdAt: Date;
}

@ObjectType()
export class PremiumAdFeeReportRow {
  @Field()
  paymentId: string;
  @Field()
  listingId: string;
  @Field()
  listingName: string;
  @Field(() => String, { nullable: true })
  providerName: string | null;
  @Field(() => String, { nullable: true })
  providerPhone: string | null;
  @Field()
  status: string;
  @Field(() => Float)
  fee: number;
  @Field()
  createdAt: Date;
}

@ObjectType()
export class ReportPageMeta {
  @Field(() => Int)
  total: number;
  @Field(() => Int)
  page: number;
  @Field(() => Int)
  limit: number;
}

@ObjectType()
export class ConversationFeeReport {
  @Field(() => [ConversationFeeReportRow])
  items: ConversationFeeReportRow[];
  @Field(() => ReportPageMeta)
  meta: ReportPageMeta;
  @Field(() => Float)
  totalCustomerFees: number;
  @Field(() => Float)
  totalProviderFees: number;
}

@ObjectType()
export class PremiumAdFeeReport {
  @Field(() => [PremiumAdFeeReportRow])
  items: PremiumAdFeeReportRow[];
  @Field(() => ReportPageMeta)
  meta: ReportPageMeta;
  @Field(() => Float)
  totalFees: number;
}
