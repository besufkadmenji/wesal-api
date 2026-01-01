import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class CreateConversationInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  advertisementId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  providerId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}
