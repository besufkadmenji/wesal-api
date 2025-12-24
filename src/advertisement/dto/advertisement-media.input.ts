import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';

@InputType()
export class AdvertisementMediaInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  url: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  sortOrder: number;
}
