import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { EmailService } from '../../lib/email/email.service';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors/i18n.exceptions';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { SmsService } from '../../lib/sms/sms.service';
import { Provider } from '../provider/entities/provider.entity';
import { ProviderService } from '../provider/provider.service';
import { ChangeEmailInput } from './dto/change-email.input';
import { ChangeEmailResponse } from './dto/change-email.response';
import { ChangePasswordInput } from './dto/change-password.input';
import { ChangePhoneInput } from './dto/change-phone.input';
import { ChangePhoneResponse } from './dto/change-phone.response';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { LoginProviderInput } from './dto/login-provider.input';
import { ProviderAuthResponse } from './dto/provider-auth-response';
import { RegisterProviderInput } from './dto/register-provider.input';
import { ResendOtpInput } from './dto/resend-otp.input';
import { ResetPasswordWithTokenInput } from './dto/reset-password-with-token.input';
import { VerifyOtpInput } from './dto/verify-otp.input';
import { VerifyPasswordResetOtpInput } from './dto/verify-password-reset-otp.input';
import { VerifyPasswordResetOtpResponse } from './dto/verify-password-reset-otp.response';
import { Otp } from './entities/otp.entity';
import { OtpType } from './enums/otp-type.enum';
import { AUTH_ERROR_MESSAGES } from './errors/auth.error-messages';

import { ProviderStatus } from '../provider/enums/provider-status.enum';
import { VerifyChangeEmailInput } from './dto/verify-change-email.input';
import { VerifyChangePhoneInput } from './dto/verify-change-phone.input';

@Injectable()
export class ProviderAuthService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    private readonly providerService: ProviderService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async register(
    registerInput: RegisterProviderInput,
    language: LanguageCode = 'en',
  ): Promise<Provider> {
    // Validate that providers provide required fields
    if (!registerInput.commercialName) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['COMMERCIAL_NAME_REQUIRED'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Create provider using ProviderService
    const savedProvider = await this.providerService.create(
      registerInput,
      language,
    );

    // Send verification OTPs
    await this.generateAndSendOtp(
      savedProvider.id,
      savedProvider.email,
      OtpType.EMAIL_VERIFICATION,
    );
    await this.generateAndSendOtp(
      savedProvider.id,
      savedProvider.phone,
      OtpType.PHONE_VERIFICATION,
    );

    return savedProvider;
  }

  async login(
    loginInput: LoginProviderInput,
    language: LanguageCode = 'en',
  ): Promise<ProviderAuthResponse> {
    // Find provider by email or phone
    const provider = await this.providerRepository
      .createQueryBuilder('provider')
      .where('provider.email = :identifier OR provider.phone = :identifier', {
        identifier: loginInput.emailOrPhone,
      })
      .getOne();

    if (!provider) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_CREDENTIALS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginInput.password,
      provider.password ?? '',
    );
    if (!isPasswordValid) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_CREDENTIALS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if account is pending admin approval
    if (
      provider.status === ProviderStatus.PENDING_APPROVAL &&
      provider.emailVerified &&
      provider.phoneVerified
    ) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['ACCOUNT_PENDING_APPROVAL'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if account is disabled
    if (
      provider.status !== ProviderStatus.ACTIVE &&
      provider.emailVerified &&
      provider.phoneVerified
    ) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['ACCOUNT_DISABLED'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if account is verified — send fresh OTP(s) and return empty token
    if (!provider.emailVerified || !provider.phoneVerified) {
      if (!provider.emailVerified) {
        await this.generateAndSendOtp(
          provider.id,
          provider.email,
          OtpType.EMAIL_VERIFICATION,
        );
      }
      if (!provider.phoneVerified) {
        await this.generateAndSendOtp(
          provider.id,
          provider.phone,
          OtpType.PHONE_VERIFICATION,
        );
      }
      return { accessToken: '', provider };
    }

    // Generate JWT token
    const payload = {
      sub: provider.id,
      email: provider.email,
      type: 'provider',
    };
    const accessToken: string = this.jwtService.sign(payload);

    return { accessToken, provider };
  }

  async verifyOtp(
    verifyOtpInput: VerifyOtpInput,
    language: LanguageCode = 'en',
    ipAddress?: string,
  ): Promise<boolean> {
    // Find valid OTP
    const otp = await this.otpRepository.findOne({
      where: {
        target: verifyOtpInput.target,
        type: verifyOtpInput.type,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otp) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_OTP'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check attempt rate limiting
    if (otp.attemptCount >= 5) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['TOO_MANY_OTP_ATTEMPTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if last attempt was less than 30 seconds ago
    if (otp.lastAttemptAt && otp.lastAttemptAt instanceof Date) {
      const timeSinceLastAttempt = Date.now() - otp.lastAttemptAt.getTime();
      if (timeSinceLastAttempt < 30000) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['PLEASE_WAIT_BEFORE_RETRY'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    // Verify OTP code
    if (otp.code !== verifyOtpInput.code) {
      otp.attemptCount += 1;
      otp.lastAttemptAt = new Date();
      await this.otpRepository.save(otp);

      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_OTP'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Verify IP address matches
    if (otp.ipAddress && ipAddress && otp.ipAddress !== ipAddress) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['IP_MISMATCH'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Mark OTP as used
    otp.isUsed = true;
    await this.otpRepository.save(otp);

    // Update provider verification status
    const provider = await this.providerRepository.findOne({
      where: { id: otp.providerId },
    });

    if (provider) {
      if (verifyOtpInput.type === OtpType.EMAIL_VERIFICATION) {
        provider.emailVerified = true;
      } else if (verifyOtpInput.type === OtpType.PHONE_VERIFICATION) {
        provider.phoneVerified = true;
      }
      await this.providerRepository.save(provider);
    }

    return true;
  }

  async resendOtp(
    resendOtpInput: ResendOtpInput,
    language: LanguageCode = 'en',
    ipAddress?: string,
  ): Promise<boolean> {
    // Check rate limiting
    const recentOtp = await this.otpRepository.findOne({
      where: {
        target: resendOtpInput.target,
        type: resendOtpInput.type,
        createdAt: MoreThan(new Date(Date.now() - 60000)),
      },
    });

    if (recentOtp) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['OTP_RATE_LIMIT'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Find provider by target
    let provider: Provider | null = null;
    if (resendOtpInput.type === OtpType.EMAIL_VERIFICATION) {
      provider = await this.providerRepository.findOne({
        where: { email: resendOtpInput.target },
      });
    } else if (resendOtpInput.type === OtpType.PHONE_VERIFICATION) {
      provider = await this.providerRepository.findOne({
        where: { phone: resendOtpInput.target },
      });
    }

    if (!provider) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['PROVIDER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Generate and send new OTP
    await this.generateAndSendOtp(
      provider.id,
      resendOtpInput.target,
      resendOtpInput.type,
      ipAddress,
    );

    return true;
  }

  async forgotPassword(
    forgotPasswordInput: ForgotPasswordInput,
  ): Promise<boolean> {
    // Find provider by email or phone
    const provider = await this.providerRepository
      .createQueryBuilder('provider')
      .where('provider.email = :identifier OR provider.phone = :identifier', {
        identifier: forgotPasswordInput.emailOrPhone,
      })
      .getOne();

    if (!provider) {
      // Don't reveal if provider exists
      return true;
    }

    // Determine if it's email or phone
    const isEmail = forgotPasswordInput.emailOrPhone.includes('@');
    const target = isEmail ? provider.email : provider.phone;

    // Generate and send OTP
    await this.generateAndSendOtp(provider.id, target, OtpType.PASSWORD_RESET);

    return true;
  }

  async verifyPasswordResetOtp(
    verifyPasswordResetOtpInput: VerifyPasswordResetOtpInput,
    language: LanguageCode = 'en',
  ): Promise<VerifyPasswordResetOtpResponse> {
    // Find valid OTP
    const otp = await this.otpRepository.findOne({
      where: {
        target: verifyPasswordResetOtpInput.target,
        type: OtpType.PASSWORD_RESET,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otp) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_OTP'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check attempt rate limiting
    if (otp.attemptCount >= 5) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['TOO_MANY_OTP_ATTEMPTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Verify OTP code
    if (otp.code !== verifyPasswordResetOtpInput.code) {
      otp.attemptCount += 1;
      otp.lastAttemptAt = new Date();
      await this.otpRepository.save(otp);

      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_OTP'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Mark OTP as used
    otp.isUsed = true;
    await this.otpRepository.save(otp);

    // Issue a temporary reset token
    const payload = { sub: otp.providerId, type: 'password_reset_provider' };
    const resetToken: string = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    return { resetToken };
  }

  async resetPassword(
    resetPasswordWithTokenInput: ResetPasswordWithTokenInput,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify<{
        type: string;
        sub: string;
      }>(resetPasswordWithTokenInput.resetToken);

      if (decoded.type !== 'password_reset_provider') {
        throw new Error('Invalid token type');
      }

      const provider = await this.providerRepository.findOne({
        where: { id: decoded.sub },
      });

      if (!provider) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['PROVIDER_NOT_FOUND'],
          language,
        );
        throw new I18nNotFoundException({ en: message, ar: message }, language);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(
        resetPasswordWithTokenInput.newPassword,
        10,
      );
      provider.password = hashedPassword;
      await this.providerRepository.save(provider);

      return true;
    } catch {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_RESET_TOKEN'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }
  }

  async changePassword(
    providerId: string,
    changePasswordInput: ChangePasswordInput,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['PROVIDER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      changePasswordInput.newPassword,
      10,
    );
    provider.password = hashedPassword;
    await this.providerRepository.save(provider);

    return true;
  }

  async initiateEmailChange(
    providerId: string,
    changeEmailInput: ChangeEmailInput,
    language: LanguageCode = 'en',
  ): Promise<ChangeEmailResponse> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['PROVIDER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if new email is already in use
    const existingProvider = await this.providerRepository.findOne({
      where: { email: changeEmailInput.newEmail },
    });

    if (existingProvider && existingProvider.id !== providerId) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['EMAIL_ALREADY_EXISTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Generate and send OTP to new email
    await this.generateAndSendOtp(
      providerId,
      changeEmailInput.newEmail,
      OtpType.EMAIL_VERIFICATION,
    );

    // Issue a temporary change token
    const payload = {
      sub: providerId,
      newEmail: changeEmailInput.newEmail,
      type: 'email_change_provider',
    };
    const changeToken: string = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    return { changeToken };
  }

  async initiatePhoneChange(
    providerId: string,
    changePhoneInput: ChangePhoneInput,
    language: LanguageCode = 'en',
  ): Promise<ChangePhoneResponse> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['PROVIDER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if new phone is already in use
    const existingProvider = await this.providerRepository.findOne({
      where: { phone: changePhoneInput.newPhone },
    });

    if (existingProvider && existingProvider.id !== providerId) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['PHONE_ALREADY_EXISTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Generate and send OTP to new phone
    await this.generateAndSendOtp(
      providerId,
      changePhoneInput.newPhone,
      OtpType.PHONE_VERIFICATION,
    );

    // Issue a temporary change token
    const payload = {
      sub: providerId,
      newPhone: changePhoneInput.newPhone,
      countryCode: changePhoneInput.countryCode,
      type: 'phone_change_provider',
    };
    const changeToken: string = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    return { changeToken };
  }

  async verifyEmailChange(
    verifyChangeEmailInput: VerifyChangeEmailInput,
    language: LanguageCode = 'en',
    ipAddress?: string,
  ): Promise<boolean> {
    try {
      // Verify and decode the change token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload: any = this.jwtService.verify(
        verifyChangeEmailInput.changeToken,
      );

      // Ensure token is an email change token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (payload.type !== 'email_change') {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['INVALID_OTP'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Find valid OTP
      const otp = await this.otpRepository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
          target: payload.newEmail,
          type: OtpType.EMAIL_VERIFICATION,
          isUsed: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!otp) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['INVALID_OTP'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Check attempt rate limiting (max 5 failed attempts per OTP)
      if (otp.attemptCount >= 5) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['TOO_MANY_OTP_ATTEMPTS'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // // Check if last attempt was less than 30 seconds ago (prevent brute force)
      // if (otp.lastAttemptAt && otp.lastAttemptAt instanceof Date) {
      //   const timeSinceLastAttempt = Date.now() - otp.lastAttemptAt.getTime();
      //   if (timeSinceLastAttempt < 30000) {
      //     // 30 seconds
      //     const message = I18nService.translate(
      //       AUTH_ERROR_MESSAGES['OTP_VERIFICATION_THROTTLED'],
      //       language,
      //     );
      //     throw new I18nBadRequestException(
      //       { en: message, ar: message },
      //       language,
      //     );
      //   }
      // }

      // Verify OTP code
      if (otp.code !== verifyChangeEmailInput.code) {
        otp.attemptCount += 1;
        otp.lastAttemptAt = new Date();
        await this.otpRepository.save(otp);

        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['INVALID_OTP'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Verify IP address matches (security check)
      if (otp.ipAddress && ipAddress && otp.ipAddress !== ipAddress) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['OTP_IP_MISMATCH'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Mark OTP as used
      otp.isUsed = true;
      await this.otpRepository.save(otp);

      // Get user from token and update email
      const user = await this.providerRepository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
          id: payload.sub,
        },
      });

      if (!user) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['USER_NOT_FOUND'],
          language,
        );
        throw new I18nNotFoundException({ en: message, ar: message }, language);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
      user.email = payload.newEmail;
      await this.providerRepository.save(user);

      return true;
    } catch (error) {
      if (
        error instanceof I18nBadRequestException ||
        error instanceof I18nNotFoundException
      ) {
        throw error;
      }

      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_OTP'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }
  }

  async verifyPhoneChange(
    verifyChangePhoneInput: VerifyChangePhoneInput,
    language: LanguageCode = 'en',
    ipAddress?: string,
  ): Promise<boolean> {
    try {
      // Verify and decode the change token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload: any = this.jwtService.verify(
        verifyChangePhoneInput.changeToken,
      );

      // Ensure token is a phone change token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (payload.type !== 'phone_change') {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['INVALID_OTP'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Find valid OTP
      const otp = await this.otpRepository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
          target: payload.newPhone,
          type: OtpType.PHONE_VERIFICATION,
          isUsed: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!otp) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['INVALID_OTP'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Check attempt rate limiting (max 5 failed attempts per OTP)
      if (otp.attemptCount >= 5) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['TOO_MANY_OTP_ATTEMPTS'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // // Check if last attempt was less than 30 seconds ago (prevent brute force)
      // if (otp.lastAttemptAt && otp.lastAttemptAt instanceof Date) {
      //   const timeSinceLastAttempt = Date.now() - otp.lastAttemptAt.getTime();
      //   if (timeSinceLastAttempt < 30000) {
      //     // 30 seconds
      //     const message = I18nService.translate(
      //       AUTH_ERROR_MESSAGES['OTP_VERIFICATION_THROTTLED'],
      //       language,
      //     );
      //     throw new I18nBadRequestException(
      //       { en: message, ar: message },
      //       language,
      //     );
      //   }
      // }

      // Verify OTP code
      if (otp.code !== verifyChangePhoneInput.code) {
        otp.attemptCount += 1;
        otp.lastAttemptAt = new Date();
        await this.otpRepository.save(otp);

        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['INVALID_OTP'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Verify IP address matches (security check)
      if (otp.ipAddress && ipAddress && otp.ipAddress !== ipAddress) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['OTP_IP_MISMATCH'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Mark OTP as used
      otp.isUsed = true;
      await this.otpRepository.save(otp);

      // Get user from token and update phone
      const user = await this.providerRepository.findOne({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
          id: payload.sub,
        },
      });

      if (!user) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['USER_NOT_FOUND'],
          language,
        );
        throw new I18nNotFoundException({ en: message, ar: message }, language);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
      user.phone = payload.newPhone;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
      user.dialCode = payload.countryCode;
      await this.providerRepository.save(user);

      return true;
    } catch (error) {
      if (
        error instanceof I18nBadRequestException ||
        error instanceof I18nNotFoundException
      ) {
        throw error;
      }

      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_OTP'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }
  }

  private async generateAndSendOtp(
    providerId: string,
    target: string,
    type: OtpType,
    ipAddress?: string,
  ): Promise<void> {
    // TODO: Replace with actual 4-digit OTP generation in production
    const code = '1234';

    // Create OTP with 10 minutes expiration
    const otp = this.otpRepository.create({
      providerId,
      target,
      type,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isUsed: false,
      ipAddress,
      attemptCount: 0,
    });
    await this.otpRepository.save(otp);

    // Send OTP based on type
    if (type === OtpType.EMAIL_VERIFICATION) {
      await this.emailService.sendVerificationEmail(target, code);
    } else if (type === OtpType.PHONE_VERIFICATION) {
      await this.smsService.sendVerificationSms(target, code);
    } else if (type === OtpType.PASSWORD_RESET) {
      if (target.includes('@')) {
        await this.emailService.sendPasswordResetEmail(target, code);
      } else {
        await this.smsService.sendPasswordResetSms(target, code);
      }
    }
  }

  async cleanupExpiredOtps(): Promise<void> {
    await this.otpRepository.delete({
      expiresAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    });
  }
}
