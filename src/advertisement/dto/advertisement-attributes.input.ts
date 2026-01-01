import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class AdvertisementAttributesInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  key: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  value: string;
}
