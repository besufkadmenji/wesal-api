import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

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
}
