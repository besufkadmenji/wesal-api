import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsUUID, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { MediaType } from '../enums/media.enum';

@InputType()
export class CreateListingMediaInput {
  @Field()
  @IsUUID('4', { message: 'id must be a valid UUID' })
  @IsNotEmpty({ message: 'id is required' })
  id: string;

  @Field()
  @IsString({ message: 'filename must be a string' })
  @IsNotEmpty({ message: 'filename is required' })
  filename: string;

  @Field()
  @IsNotEmpty({ message: 'type is required' })
  type: MediaType;

  @Field()
  @IsNumber({}, { message: 'sortOrder must be a number' })
  @Min(0, { message: 'sortOrder must be greater than or equal to 0' })
  @IsNotEmpty({ message: 'sortOrder is required' })
  sortOrder: number;
}
