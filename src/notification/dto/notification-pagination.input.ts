import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsUUID, IsEnum, IsBoolean, IsIn } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { NotificationType } from '../enums/notification-type.enum';

const NOTIFICATION_SORTABLE_FIELDS = [
  'id',
  'type',
  'isRead',
  'createdAt',
] as const;

export type NotificationSortField =
  (typeof NOTIFICATION_SORTABLE_FIELDS)[number];

export enum NotificationSortFieldEnum {
  id = 'id',
  type = 'type',
  isRead = 'isRead',
  createdAt = 'createdAt',
}

registerEnumType(NotificationSortFieldEnum, {
  name: 'NotificationSortField',
  description: 'Available fields to sort notifications by',
});

@InputType()
export class NotificationPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field(() => NotificationType, { nullable: true })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @Field(() => NotificationSortFieldEnum, {
    nullable: true,
    description: 'Sort field name',
  })
  @IsOptional()
  @IsIn(NOTIFICATION_SORTABLE_FIELDS)
  sortBy?: NotificationSortField;
}
