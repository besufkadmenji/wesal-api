import { Field, ObjectType } from '@nestjs/graphql';
import { ConversationAccess } from '../../conversation/dto/conversation-access.response';
import { Conversation } from '../../conversation/entities/conversation.entity';
import { Payment } from '../entities/payment.entity';

@ObjectType()
export class ConversationFeePaymentResponse {
  @Field(() => Payment, { nullable: true })
  payment: Payment | null;

  @Field(() => Conversation)
  conversation: Conversation;

  @Field(() => ConversationAccess)
  access: ConversationAccess;
}
