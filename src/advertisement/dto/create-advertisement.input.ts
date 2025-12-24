import { InputType, Field, Float } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdvertisementStatus } from '../enums/advertisement-status.enum';
import { AdvertisementMediaInput } from './advertisement-media.input';
import { AdvertisementAttributesInput } from './advertisement-attributes.input';

@InputType()
export class CreateAdvertisementInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  description: string;

  @Field(() => Float)
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  cityId: string;

  @Field(() => AdvertisementStatus, { nullable: true })
  @IsOptional()
  @IsEnum(AdvertisementStatus)
  status?: AdvertisementStatus;

  @Field(() => [AdvertisementMediaInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdvertisementMediaInput)
  media?: AdvertisementMediaInput[];

  @Field(() => [AdvertisementAttributesInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdvertisementAttributesInput)
  attributes?: AdvertisementAttributesInput[];
}
