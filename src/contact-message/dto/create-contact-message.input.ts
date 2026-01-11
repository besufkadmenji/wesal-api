import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEmail, IsPhoneNumber, IsOptional } from 'class-validator';

@InputType()
export class CreateContactMessageInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dialCode?: string;

  @Field()
  @IsString()
  phone: string;

  @Field()
  @IsString()
  messageType: string;

  @Field()
  @IsString()
  messageContent: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  attachmentFilename?: string;
}
