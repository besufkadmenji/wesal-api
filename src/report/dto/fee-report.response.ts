import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ConversationFeeReportRow {
  @Field()
  conversationId: string;
  @Field(() => Int, { nullable: true })
  conversationNumber: number | null;
  @Field(() => String, { nullable: true })
  customerName: string | null;
  @Field(() => String, { nullable: true })
  providerName: string | null;
  @Field(() => String, { nullable: true })
  providerPhone: string | null;
  @Field()
  status: string;
  @Field(() => Float)
  customerFee: number;
  @Field(() => Float)
  providerFee: number;
  @Field()
  startedAt: Date;
  @Field(() => Date, { nullable: true })
  endedAt: Date | null;
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
  @Field(() => Date, { nullable: true })
  featuredStartsAt: Date | null;
  @Field(() => Date, { nullable: true })
  featuredEndsAt: Date | null;
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

@ObjectType()
export class ContractFinancialReportRow {
  @Field()
  contractId: string;
  @Field(() => Int, { nullable: true })
  contractNumber: number | null;
  @Field()
  status: string;
  @Field(() => String, { nullable: true })
  customerName: string | null;
  @Field(() => String, { nullable: true })
  providerName: string | null;
  @Field(() => String, { nullable: true })
  deliveryCompanyName: string | null;
  @Field(() => Float)
  providerNet: number;
  @Field(() => Float)
  vat: number;
  @Field(() => Float)
  commission: number;
  @Field(() => Float)
  totalPaid: number;
  @Field(() => Float)
  customerRefund: number;
  @Field(() => Float)
  providerRelease: number;
  @Field()
  createdAt: Date;
}

@ObjectType()
export class ContractFinancialReport {
  @Field(() => [ContractFinancialReportRow])
  items: ContractFinancialReportRow[];
  @Field(() => ReportPageMeta)
  meta: ReportPageMeta;
  @Field(() => Int)
  completedCount: number;
  @Field(() => Float)
  totalProviderNet: number;
  @Field(() => Float)
  totalVat: number;
  @Field(() => Float)
  totalCommission: number;
  @Field(() => Float)
  totalPaid: number;
  @Field(() => Float)
  totalCustomerRefunds: number;
  @Field(() => Float)
  totalProviderReleases: number;
}
