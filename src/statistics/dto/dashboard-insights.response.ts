import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { ContractStatus } from '../../contract/enums/contract-status.enum';

@ObjectType({ description: 'Platform revenue in one dashboard bucket (SAR)' })
export class DashboardRevenuePoint {
  @Field({ description: 'Bucket start date (YYYY-MM-DD, Asia/Riyadh)' })
  bucket: string;

  @Field(() => Float, {
    description: 'Commission from paid contracts (charity contracts excluded)',
  })
  contracts: number;

  @Field(() => Float, { description: 'Customer and provider chat fees' })
  chatFees: number;

  @Field(() => Float, { description: 'Premium ad fees' })
  premiumAds: number;
}

@ObjectType({ description: 'New sign-ups in one dashboard bucket' })
export class DashboardGrowthPoint {
  @Field({ description: 'Bucket start date (YYYY-MM-DD, Asia/Riyadh)' })
  bucket: string;

  @Field(() => Int)
  customers: number;

  @Field(() => Int)
  providers: number;
}

@ObjectType({ description: 'Contracts created in the period, per status' })
export class DashboardContractStatusCount {
  @Field(() => ContractStatus)
  status: ContractStatus;

  @Field(() => Int)
  count: number;
}

@ObjectType({
  description: 'Category ranked by contracts created in the period',
})
export class DashboardTopCategory {
  @Field(() => ID)
  categoryId: string;

  @Field()
  nameAr: string;

  @Field()
  nameEn: string;

  @Field(() => Int)
  contracts: number;
}

@ObjectType({
  description:
    'Work waiting for an admin; a count is null when the admin lacks that permission',
})
export class DashboardAttentionCounts {
  @Field(() => Int, { nullable: true })
  pendingProviderRequests: number | null;

  @Field(() => Int, { nullable: true })
  openComplaints: number | null;

  @Field(() => Int, { nullable: true })
  cancellationRequests: number | null;

  @Field(() => Int, { nullable: true })
  disputedContracts: number | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Provider e-contract termination requests (S4-58)',
  })
  terminationRequests: number | null;
}
