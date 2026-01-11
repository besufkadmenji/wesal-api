import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PaginationInput } from 'lib/common/dto/pagination.input';

const CONTACT_MESSAGE_SORTABLE_FIELDS = ['id', 'createdAt', 'isRead'] as const;
export type ContactMessageSortField =
  (typeof CONTACT_MESSAGE_SORTABLE_FIELDS)[number];

export enum ContactMessageSortFieldEnum {
  id = 'id',
  createdAt = 'createdAt',
  isRead = 'isRead',
}

registerEnumType(ContactMessageSortFieldEnum, {
  name: 'ContactMessageSortField',
  description: 'Fields to sort contact messages by',
});

@InputType()
export class ContactMessagePaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  messageType?: string;

  @Field(() => ContactMessageSortFieldEnum, { nullable: true })
  @IsOptional()
  @IsIn(CONTACT_MESSAGE_SORTABLE_FIELDS as readonly string[])
  sortBy?: ContactMessageSortField;
}
