import { Field, Int, ObjectType } from '@nestjs/graphql';
import { MediaType } from '../enums/media.enum';

@ObjectType()
export class ListingMedia {
  @Field()
  id: string;

  @Field()
  filename: string;

  @Field()
  originalFilename: string;

  @Field(() => Int)
  size: number;

  @Field(() => MediaType)
  type: MediaType;

  @Field()
  sortOrder: number;
}
