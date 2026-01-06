import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ChangePhoneResponse {
  @Field()
  changeToken: string;
}
