import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsString,
  MinLength,
} from 'class-validator';
import { ComplaintReason } from '../enums/complaint-reason.enum';

@InputType()
export class CreateComplaintInput {
  // The reporter (userId) is taken from the authenticated token, not input.
  @Field()
  @IsNotEmpty()
  @IsUUID()
  listingId: string;

  @Field(() => ComplaintReason)
  @IsNotEmpty()
  @IsEnum(ComplaintReason)
  reason: ComplaintReason;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  description: string;
}
