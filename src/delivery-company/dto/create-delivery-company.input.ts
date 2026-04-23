import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { DeliveryCompanyStatus } from '../enums/delivery-company-status.enum';

@InputType()
export class CreateDeliveryCompanyInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z0-9\s]+$/, {
    message: 'nameEn must contain English letters and numbers only',
  })
  nameEn: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @Matches(/^[\p{Script=Arabic}0-9٠-٩\s]+$/u, {
    message: 'nameAr must contain Arabic letters and numbers only',
  })
  nameAr: string;

  @Field(() => DeliveryCompanyStatus)
  @IsNotEmpty()
  @IsEnum(DeliveryCompanyStatus)
  status: DeliveryCompanyStatus;
}
