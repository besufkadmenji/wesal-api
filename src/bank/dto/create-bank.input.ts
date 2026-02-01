import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BankStatus } from '../enums/bank-status.enum';

@InputType()
export class CreateBankInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  nameEn: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  nameAr: string;

  @Field(() => BankStatus)
  @IsNotEmpty()
  @IsEnum(BankStatus)
  status: BankStatus;
}
