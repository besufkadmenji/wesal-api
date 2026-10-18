import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Public home page statistics' })
export class PlatformStats {
  @Field(() => Int, { description: 'Completed (successful) contracts' })
  completedContracts: number;

  @Field(() => Int, { description: 'Active, non-deleted service providers' })
  providers: number;

  @Field(() => Int, { description: 'Active, non-deleted customers' })
  customers: number;
}
