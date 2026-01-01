import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsIn } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

const MESSAGE_SORTABLE_FIELDS = ['id', 'createdAt', 'updatedAt'] as const;

export type MessageSortField = (typeof MESSAGE_SORTABLE_FIELDS)[number];

export enum MessageSortFieldEnum {
  id = 'id',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(MessageSortFieldEnum, {
  name: 'MessageSortField',
  description: 'Available fields to sort messages by',
});

@InputType()
export class MessagePaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  senderId?: string;

  @Field(() => MessageSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(MESSAGE_SORTABLE_FIELDS)
  sortBy?: MessageSortField;
}
