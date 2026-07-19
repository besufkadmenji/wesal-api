import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationInput } from '../../../lib/common/dto/pagination.input';

@InputType()
export class FeeReportInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  status?: string;
}
