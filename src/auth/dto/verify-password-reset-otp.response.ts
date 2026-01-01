import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class VerifyPasswordResetOtpResponse {
  @Field()
  resetToken: string;
}
