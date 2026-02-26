import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import * as React from 'react';
import { Resend } from 'resend';
import type { RejectionEmailLocale } from '../../emails/rejection.email';
import RejectionEmail from '../../emails/rejection.email';
import type { VerifyEmailLocale } from '../../emails/verify.email';
import VerifyEmail from '../../emails/verify.email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');
    this.from = this.configService.getOrThrow<string>('RESEND_FROM');
    this.resend = new Resend(apiKey);
  }

  async sendVerificationEmail(
    email: string,
    code: string,
    locale: VerifyEmailLocale = 'en',
    name?: string,
  ): Promise<boolean> {
    const subject =
      locale === 'ar'
        ? 'رمز التحقق من بريدك في وصال'
        : 'Verify your Wesal email';

    const html = await render(
      React.createElement(VerifyEmail, {
        code,
        locale,
        name,
        type: 'email_verification',
      }),
    );

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      bcc: 'besufkadmenji@gmail.com',
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      return false;
    }

    this.logger.log(`Verification email sent to ${email}`);
    return true;
  }

  async sendPasswordResetEmail(
    email: string,
    code: string,
    locale: VerifyEmailLocale = 'en',
    name?: string,
  ): Promise<boolean> {
    const subject =
      locale === 'ar'
        ? 'إعادة تعيين كلمة مرور وصال'
        : 'Reset your Wesal password';

    const html = await render(
      React.createElement(VerifyEmail, {
        code,
        locale,
        name,
        type: 'password_reset',
      }),
    );

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      bcc: 'besufkadmenji@gmail.com',
      subject,
      html,
    });

    if (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      return false;
    }

    this.logger.log(`Password reset email sent to ${email}`);
    return true;
  }

  async sendRejectionEmail(
    email: string,
    reason: string,
    locale: RejectionEmailLocale = 'en',
    name?: string,
  ): Promise<boolean> {
    const subject =
      locale === 'ar'
        ? 'تم رفض طلب انضمامك في وصال'
        : 'Your Wesal service provider application has been rejected';

    const html = await render(
      React.createElement(RejectionEmail, {
        reason,
        locale,
        name,
      }),
    );

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      bcc: 'besufkadmenji@gmail.com',
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Failed to send rejection email to ${email}`, error);
      return false;
    }

    this.logger.log(`Rejection email sent to ${email}`);
    return true;
  }
}
