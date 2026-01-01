import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  async sendVerificationSms(phone: string, code: string): Promise<boolean> {
    // Mock SMS sending
    console.log(`[MOCK SMS] Sending verification SMS to: ${phone}`);
    console.log(`[MOCK SMS] Verification code: ${code}`);
    console.log(
      `[MOCK SMS] Message: Your Wesal verification code is: ${code}. Valid for 10 minutes.`,
    );
    console.log('---');

    // Simulate async operation
    return Promise.resolve(true);
  }

  async sendPasswordResetSms(phone: string, code: string): Promise<boolean> {
    // Mock SMS sending
    console.log(`[MOCK SMS] Sending password reset SMS to: ${phone}`);
    console.log(`[MOCK SMS] Reset code: ${code}`);
    console.log(
      `[MOCK SMS] Message: Your Wesal password reset code is: ${code}. Valid for 10 minutes.`,
    );
    console.log('---');

    // Simulate async operation
    return Promise.resolve(true);
  }
}
