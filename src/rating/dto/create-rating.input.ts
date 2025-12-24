import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
} from 'class-validator';

@InputType()
export class CreateRatingInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  advertisementId: string;

  @Field(() => Int)
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;
}
