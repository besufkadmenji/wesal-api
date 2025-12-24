import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsBoolean, IsIn } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

const CONVERSATION_SORTABLE_FIELDS = [
  'id',
  'isPaid',
  'createdAt',
  'updatedAt',
] as const;

export type ConversationSortField =
  (typeof CONVERSATION_SORTABLE_FIELDS)[number];

export enum ConversationSortFieldEnum {
  id = 'id',
  isPaid = 'isPaid',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(ConversationSortFieldEnum, {
  name: 'ConversationSortField',
  description: 'Available fields to sort conversations by',
});

@InputType()
export class ConversationPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  advertisementId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @Field(() => ConversationSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(CONVERSATION_SORTABLE_FIELDS)
  sortBy?: ConversationSortField;
}
