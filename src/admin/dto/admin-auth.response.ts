import { Field, ObjectType } from '@nestjs/graphql';
import { Admin } from '../entities/admin.entity';

@ObjectType()
export class AdminAuthResponse {
  @Field()
  accessToken: string;

  @Field(() => Admin)
  admin: Admin;
}
