import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsPhoneNumber } from 'class-validator';

@InputType()
export class ChangePhoneInput {
  @Field()
  @IsNotEmpty()
  @IsPhoneNumber()
  newPhone: string;
}
