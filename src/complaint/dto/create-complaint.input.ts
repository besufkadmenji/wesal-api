import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ComplaintReason } from '../enums/complaint-reason.enum';
import { ComplaintStatus } from '../enums/complaint-status.enum';

@InputType()
export class CreateComplaintInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  advertisementId: string;

  @Field(() => ComplaintReason)
  @IsNotEmpty()
  @IsEnum(ComplaintReason)
  reason: ComplaintReason;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  description: string;

  @Field(() => ComplaintStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;
}
