import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  rulesAr?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  rulesEn?: string;
}
