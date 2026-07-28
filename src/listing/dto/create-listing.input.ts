import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ListingStatus, ListingType } from '../enums/listing.enum';
import { CreateListingMediaInput } from './create-listing-media.input';
import { Type } from 'class-transformer';

@InputType()
export class CreateListingInput {
  @Field()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  @IsNotEmpty({ message: 'categoryId is required' })
  categoryId: string;

  @Field()
  @IsString({ message: 'name must be a string' })
  @MinLength(3, { message: 'name must be at least 3 characters long' })
  @MaxLength(200, { message: 'name must not exceed 200 characters' })
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @Field()
  @IsString({ message: 'description must be a string' })
  @MinLength(10, { message: 'description must be at least 10 characters long' })
  @MaxLength(5000, { message: 'description must not exceed 5000 characters' })
  @IsNotEmpty({ message: 'description is required' })
  description: string;

  @Field()
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'price must be a valid number' },
  )
  @Min(0, { message: 'price must be greater than or equal to 0' })
  @Max(999999.99, { message: 'price must not exceed 999999.99' })
  @IsNotEmpty({ message: 'price is required' })
  price: number;

  @Field()
  @IsUUID('4', { message: 'cityId must be a valid UUID' })
  @IsNotEmpty({ message: 'cityId is required' })
  cityId: string;

  @Field(() => ListingStatus, { nullable: true })
  @IsOptional()
  status?: ListingStatus;

  @Field(() => ListingType)
  @IsNotEmpty({ message: 'type is required' })
  type: ListingType;

  @Field(() => CreateListingMediaInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateListingMediaInput)
  story?: CreateListingMediaInput | null;

  @Field(() => [CreateListingMediaInput], { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => CreateListingMediaInput)
  photos: CreateListingMediaInput[];
}
