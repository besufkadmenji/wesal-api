import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VerifyAdminPasswordResetOtpResponse {
  @Field()
  resetToken: string;
}
