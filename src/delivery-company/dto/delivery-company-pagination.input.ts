import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationInput } from 'lib/common/dto/pagination.input';
import { DeliveryCompanyStatus } from '../enums/delivery-company-status.enum';

@InputType()
export class DeliveryCompanyPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => DeliveryCompanyStatus, { nullable: true })
  @IsOptional()
  @IsEnum(DeliveryCompanyStatus)
  status?: DeliveryCompanyStatus;
}
