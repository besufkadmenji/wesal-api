import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class RemoveListingResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}
