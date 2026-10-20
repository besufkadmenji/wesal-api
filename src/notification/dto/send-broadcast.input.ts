import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  BroadcastAudience,
  BroadcastRecipientType,
} from '../enums/broadcast.enum';

@InputType()
export class BroadcastRecipientInput {
  @Field()
  @IsUUID()
  id: string;

  @Field(() => BroadcastRecipientType)
  @IsEnum(BroadcastRecipientType)
  type: BroadcastRecipientType;
}

@InputType()
export class SendBroadcastInput {
  @Field()
  @IsString()
  @MaxLength(255)
  title: string;

  @Field()
  @IsString()
  @MaxLength(2000)
  message: string;

  @Field(() => [BroadcastRecipientType])
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(BroadcastRecipientType, { each: true })
  recipientTypes: BroadcastRecipientType[];

  @Field(() => BroadcastAudience)
  @IsEnum(BroadcastAudience)
  audience: BroadcastAudience;

  @Field(() => [BroadcastRecipientInput], {
    nullable: true,
    description: 'Required when audience is SELECTED',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BroadcastRecipientInput)
  recipients?: BroadcastRecipientInput[];
}
