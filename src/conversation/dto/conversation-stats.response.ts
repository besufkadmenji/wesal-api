import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ConversationStats {
  @Field(() => Int)
  unreadCount: number;
}
