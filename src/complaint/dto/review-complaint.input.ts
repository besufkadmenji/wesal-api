import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsString, IsOptional } from 'class-validator';

@InputType()
export class ReviewComplaintInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  complaintId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  reviewerId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  adminResponse: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  action?: string;
}
