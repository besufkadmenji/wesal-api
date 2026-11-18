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

  @Field(() => Date, { nullable: true })
  expiresAt: Date | null;

  @Field(() => Date, {
    nullable: true,
    description: 'S4-67: when the chat closes after the completed contract',
  })
  closesAt: Date | null;

  @Field()
  feeCycle: number;
}
