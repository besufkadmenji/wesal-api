import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Admin home statistics cards (BRD 4.3.3)' })
export class AdminDashboardStats {
  @Field(() => Int, { description: 'Active, non-deleted customers' })
  customers: number;

  @Field(() => Int, { description: 'Active, non-deleted service providers' })
  providers: number;

  @Field(() => Int, { description: 'Completed contracts' })
  completedContracts: number;

  @Field(() => Int, {
    description:
      'Chat messages sent by customers and providers today (Asia/Riyadh); system messages are excluded',
  })
  messagesToday: number;

  @Field(() => Int, { description: 'Published featured ads' })
  featuredListings: number;

  @Field(() => Int, { description: 'Published free ads' })
  freeListings: number;
}
