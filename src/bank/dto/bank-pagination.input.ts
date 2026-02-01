import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationInput } from 'lib/common/dto/pagination.input';
import { BankStatus } from '../enums/bank-status.enum';

@InputType()
export class BankPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => BankStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BankStatus)
  status?: BankStatus;
}
