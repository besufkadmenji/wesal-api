import { registerEnumType } from '@nestjs/graphql';

export enum OtpType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PHONE_VERIFICATION = 'PHONE_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

registerEnumType(OtpType, {
  name: 'OtpType',
  description: 'Type of OTP',
});
