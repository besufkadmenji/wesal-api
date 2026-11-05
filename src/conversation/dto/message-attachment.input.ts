import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/**
 * A photo sent in a chat (BRD: "Ability to send text messages and photos",
 * ClickUp 869fnwhm3). The file is uploaded first through POST /upload.
 */
@InputType()
export class MessageAttachmentInput {
  /** Name the upload endpoint returned: a UUID plus an image extension. */
  @Field()
  @IsString()
  @Matches(/^[0-9a-f-]{36}\.(jpe?g|png|webp)$/i)
  filename: string;

  @Field()
  @IsString()
  @MaxLength(255)
  originalFilename: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  size: number;
}
