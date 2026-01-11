import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class CreateFaqInput {
  @Field()
  @IsString()
  questionEn: string;

  @Field()
  @IsString()
  questionAr: string;

  @Field()
  @IsString()
  answerEn: string;

  @Field()
  @IsString()
  answerAr: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  order?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
