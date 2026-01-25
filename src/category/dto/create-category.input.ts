import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class CreateCategoryInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  image: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  nameEn: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  nameAr: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  descriptionEn: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  descriptionAr: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  rulesAr: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  rulesEn: string;
}
