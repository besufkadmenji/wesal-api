import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ChangeEmailResponse {
  @Field()
  changeToken: string;
}
