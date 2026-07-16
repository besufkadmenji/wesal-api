import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ConversationAccess {
  @Field()
  feeRequired: boolean;

  @Field(() => Float)
  feeAmount: number;

  @Field(() => Date, { nullable: true })
  paidAt: Date | null;

  @Field()
  canSend: boolean;
}
