import { registerEnumType } from '@nestjs/graphql';

export enum MessageKind {
  TEXT = 'TEXT',
  CONTRACT_CREATED = 'CONTRACT_CREATED',
  CONTRACT_ACCEPTED = 'CONTRACT_ACCEPTED',
  CONTRACT_REJECTED = 'CONTRACT_REJECTED',
  CONTRACT_RESENT = 'CONTRACT_RESENT',
  CONTRACT_PAID = 'CONTRACT_PAID',
  CHAT_FEE_PAID = 'CHAT_FEE_PAID',
}

registerEnumType(MessageKind, {
  name: 'MessageKind',
  description: 'User text or a typed system event in a conversation',
});
