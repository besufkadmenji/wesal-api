import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';
import { BroadcastRecipientType } from '../enums/broadcast.enum';

@InputType()
export class BroadcastPaginationInput extends PaginationInput {
  @Field({ nullable: true, description: 'Search by title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @Field(() => BroadcastRecipientType, { nullable: true })
  @IsOptional()
  @IsEnum(BroadcastRecipientType)
  recipientType?: BroadcastRecipientType;
}
