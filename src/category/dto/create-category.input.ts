import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

@InputType()
export class CreateCategoryInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string;

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
}
