import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendVerificationEmail(email: string, code: string): Promise<boolean> {
    // Mock email sending
    console.log(`[MOCK EMAIL] Sending verification email to: ${email}`);
    console.log(`[MOCK EMAIL] Verification code: ${code}`);
    console.log(`[MOCK EMAIL] Subject: Verify your email`);
    console.log(
      `[MOCK EMAIL] Message: Your verification code is: ${code}. It will expire in 10 minutes.`,
    );
    console.log('---');

    // Simulate async operation
    return Promise.resolve(true);
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<boolean> {
    // Mock email sending
    console.log(`[MOCK EMAIL] Sending password reset email to: ${email}`);
    console.log(`[MOCK EMAIL] Reset code: ${code}`);
    console.log(`[MOCK EMAIL] Subject: Reset your password`);
    console.log(
      `[MOCK EMAIL] Message: Your password reset code is: ${code}. It will expire in 10 minutes.`,
    );
    console.log('---');

    // Simulate async operation
    return Promise.resolve(true);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    // Mock email sending
    console.log(`[MOCK EMAIL] Sending welcome email to: ${email}`);
    console.log(`[MOCK EMAIL] Subject: Welcome to Wesal`);
    console.log(
      `[MOCK EMAIL] Message: Welcome ${name}! Your account is now active.`,
    );
    console.log('---');

    // Simulate async operation
    return Promise.resolve(true);
  }
}
