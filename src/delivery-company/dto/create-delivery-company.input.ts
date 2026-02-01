import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DeliveryCompanyStatus } from '../enums/delivery-company-status.enum';

@InputType()
export class CreateDeliveryCompanyInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  nameEn: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  nameAr: string;

  @Field(() => DeliveryCompanyStatus)
  @IsNotEmpty()
  @IsEnum(DeliveryCompanyStatus)
  status: DeliveryCompanyStatus;
}
