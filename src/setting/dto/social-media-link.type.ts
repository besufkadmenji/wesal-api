import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class SocialMediaLink {
  @Field()
  name: string;

  @Field()
  link: string;
}
