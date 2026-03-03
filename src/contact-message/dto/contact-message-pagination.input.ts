import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationInput } from 'lib/common/dto/pagination.input';
import {
  ContactMessageStatus,
  MessageType,
  SenderType,
} from '../entities/contact-message.entity';

const CONTACT_MESSAGE_SORTABLE_FIELDS = ['id', 'createdAt', 'status'] as const;
export type ContactMessageSortField =
  (typeof CONTACT_MESSAGE_SORTABLE_FIELDS)[number];

export enum ContactMessageSortFieldEnum {
  id = 'id',
  createdAt = 'createdAt',
  status = 'status',
}

registerEnumType(ContactMessageSortFieldEnum, {
  name: 'ContactMessageSortField',
  description: 'Fields to sort contact messages by',
});

@InputType()
export class ContactMessagePaginationInput extends PaginationInput {
  @Field({
    nullable: true,
    description: 'Search across name, email, phone, and message content',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => ContactMessageStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ContactMessageStatus)
  status?: ContactMessageStatus;

  @Field(() => SenderType, { nullable: true })
  @IsOptional()
  @IsEnum(SenderType)
  senderType?: SenderType;

  @Field(() => MessageType, { nullable: true })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @Field({ nullable: true, description: 'Filter messages from this date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @Field({ nullable: true, description: 'Filter messages until this date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;

  @Field(() => ContactMessageSortFieldEnum, { nullable: true })
  @IsOptional()
  @IsIn(CONTACT_MESSAGE_SORTABLE_FIELDS as readonly string[])
  sortBy?: ContactMessageSortField;
}
