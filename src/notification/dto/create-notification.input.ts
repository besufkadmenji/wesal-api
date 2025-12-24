import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { NotificationType } from '../enums/notification-type.enum';

@InputType()
export class CreateNotificationInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @Field(() => NotificationType)
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  title: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  message: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
