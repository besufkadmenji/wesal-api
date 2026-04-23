import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { BankStatus } from '../enums/bank-status.enum';

@InputType()
export class CreateBankInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z\s]+$/, {
    message: 'nameEn must contain English letters only',
  })
  nameEn: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @Matches(/^[\p{Script=Arabic}\s]+$/u, {
    message: 'nameAr must contain Arabic letters only',
  })
  nameAr: string;

  @Field(() => BankStatus)
  @IsNotEmpty()
  @IsEnum(BankStatus)
  status: BankStatus;
}
