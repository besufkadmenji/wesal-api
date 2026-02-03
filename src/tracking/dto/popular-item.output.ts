import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PopularItem {
  @Field(() => String)
  targetId: string;

  @Field(() => Int)
  count: number;
}
