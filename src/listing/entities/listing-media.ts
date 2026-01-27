import { Field, ObjectType } from '@nestjs/graphql';
import { MediaType } from '../enums/media.enum';

@ObjectType()
export class ListingMedia {
  @Field()
  id: string;

  @Field()
  filename: string;

  @Field(() => MediaType)
  type: MediaType;

  @Field()
  sortOrder: number;
}
