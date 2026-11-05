import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MessageAttachmentInput } from './message-attachment.input';

@InputType()
export class CreateMessageInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;

  // The sender is taken from the authenticated token, never from the client.
  // Text may be empty when a photo is sent; the service refuses both empty.
  @Field({ defaultValue: '' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content: string;

  @Field(() => MessageAttachmentInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => MessageAttachmentInput)
  attachment?: MessageAttachmentInput;
}
