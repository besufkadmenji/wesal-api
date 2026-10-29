import { InputType, Field } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { FAQ_ERROR_CODES } from '../errors/faq.error-codes';
// Registers the codes' translations wherever the DTO is loaded.
import '../errors/faq.error-messages';

@InputType()
export class CreateFaqInput {
  @Field()
  @IsString()
  @Length(3, 100, { message: FAQ_ERROR_CODES.QUESTION_EN_LENGTH })
  questionEn: string;

  @Field()
  @IsString()
  @Length(3, 100, { message: FAQ_ERROR_CODES.QUESTION_AR_LENGTH })
  questionAr: string;

  @Field()
  @IsString()
  @Length(10, 500, { message: FAQ_ERROR_CODES.ANSWER_EN_LENGTH })
  answerEn: string;

  @Field()
  @IsString()
  @Length(10, 500, { message: FAQ_ERROR_CODES.ANSWER_AR_LENGTH })
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
