import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsIn, IsEnum } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { ConversationStatus } from '../enums/conversation-status.enum';

const CONVERSATION_SORTABLE_FIELDS = [
  'id',
  'status',
  'createdAt',
  'updatedAt',
  'lastActivityAt',
] as const;

export type ConversationSortField =
  (typeof CONVERSATION_SORTABLE_FIELDS)[number];

export enum ConversationSortFieldEnum {
  id = 'id',
  status = 'status',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  lastActivityAt = 'lastActivityAt',
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
  listingId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field(() => ConversationStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @Field(() => ConversationSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(CONVERSATION_SORTABLE_FIELDS)
  sortBy?: ConversationSortField;
}
