import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { MessageType } from '../entities/contact-message.entity';

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

  @Field(() => MessageType, { defaultValue: MessageType.REQUEST })
  @IsEnum(MessageType)
  messageType: MessageType;

  @Field()
  @IsString()
  messageContent: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  attachmentFilename?: string;
}
