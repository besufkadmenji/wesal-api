import { Injectable } from '@nestjs/common';

/**
 * Fixed verification code for every account type (customers, providers,
 * admins) while SMS is mocked: testers can't read a random code from the API
 * log. When a real SMS gateway is connected, return a random code again,
 * e.g. `randomInt(0, 10_000).toString().padStart(4, '0')` from `crypto`.
 */
export const MOCK_OTP_CODE = '1234';

@Injectable()
export class OtpCodeGenerator {
  generate(): string {
    return MOCK_OTP_CODE;
  }
}
