import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class NotificationStats {
  @Field(() => Int)
  totalNotifications: number;

  @Field(() => Int)
  unreadCount: number;

  @Field(() => Int)
  readCount: number;
}
