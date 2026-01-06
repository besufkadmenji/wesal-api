import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { LessThan, MoreThan, Repository } from 'typeorm';

import { EmailService } from 'lib/email/email.service';
import { I18nBadRequestException, I18nNotFoundException } from 'lib/errors';
import { I18nService } from 'lib/i18n/i18n.service';
import { LanguageCode } from 'lib/i18n/language.types';
import { SmsService } from 'lib/sms/sms.service';
import { User } from 'src/user/entities/user.entity';
import { UserRole } from 'src/user/enums/user-role.enum';
import { UserService } from 'src/user/user.service';
import { AuthResponse } from './dto/auth-response';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { ResendOtpInput } from './dto/resend-otp.input';
import { ResetPasswordWithTokenInput } from './dto/reset-password-with-token.input';
import { VerifyOtpInput } from './dto/verify-otp.input';
import { VerifyPasswordResetOtpInput } from './dto/verify-password-reset-otp.input';
import { VerifyPasswordResetOtpResponse } from './dto/verify-password-reset-otp.response';
import { ChangePasswordInput } from './dto/change-password.input';
import { Otp } from './entities/otp.entity';
import { OtpType } from './enums/otp-type.enum';
import { AUTH_ERROR_MESSAGES } from './errors/auth.error-messages';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async register(
    registerInput: RegisterInput,
    language: LanguageCode = 'en',
  ): Promise<User> {
    // Validate that providers provide bank details
    if (
      registerInput.role === UserRole.USER &&
      (!registerInput.bankName || !registerInput.ibanNumber)
    ) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['PROVIDER_BANK_DETAILS_REQUIRED'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Create user using UserService (handles validation, hashing, and categories)
    const savedUser = await this.userService.create(registerInput, language);

    // Send verification OTPs
    await this.generateAndSendOtp(
      savedUser.id,
      savedUser.email,
      OtpType.EMAIL_VERIFICATION,
    );
    await this.generateAndSendOtp(
      savedUser.id,
      savedUser.phone,
      OtpType.PHONE_VERIFICATION,
    );

    return savedUser;
  }

  async login(
    loginInput: LoginInput,
    language: LanguageCode = 'en',
  ): Promise<AuthResponse> {
    // Find user by email or phone
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :identifier OR user.phone = :identifier', {
        identifier: loginInput.emailOrPhone,
      })
      .andWhere('user.role = :role', { role: loginInput.role })
      .getOne();

    if (!user) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_CREDENTIALS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginInput.password,
      user.password,
    );
    if (!isPasswordValid) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['INVALID_CREDENTIALS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if account is verified
    if (!user.emailVerified || !user.phoneVerified) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['ACCOUNT_NOT_VERIFIED'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken: string = this.jwtService.sign(payload);

    return { accessToken, user };
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

    // Check attempt rate limiting (max 5 failed attempts per OTP)
    if (otp.attemptCount >= 5) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['TOO_MANY_OTP_ATTEMPTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if last attempt was less than 30 seconds ago (prevent brute force)
    if (otp.lastAttemptAt && otp.lastAttemptAt instanceof Date) {
      const timeSinceLastAttempt = Date.now() - otp.lastAttemptAt.getTime();
      if (timeSinceLastAttempt < 30000) {
        // 30 seconds
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['OTP_VERIFICATION_THROTTLED'],
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

    // Verify IP address matches (security check)
    if (otp.ipAddress && ipAddress && otp.ipAddress !== ipAddress) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['OTP_IP_MISMATCH'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Mark OTP as used
    otp.isUsed = true;
    await this.otpRepository.save(otp);

    // Update user verification status
    const user = await this.userRepository.findOne({
      where: { id: otp.userId },
    });

    if (user) {
      if (verifyOtpInput.type === OtpType.EMAIL_VERIFICATION) {
        user.emailVerified = true;
        // Send welcome email if both are verified
        if (user.phoneVerified && user.name) {
          await this.emailService.sendWelcomeEmail(user.email, user.name);
        }
      } else if (verifyOtpInput.type === OtpType.PHONE_VERIFICATION) {
        user.phoneVerified = true;
        // Send welcome email if both are verified
        if (user.emailVerified && user.name) {
          await this.emailService.sendWelcomeEmail(user.email, user.name);
        }
      }
      await this.userRepository.save(user);
    }

    return true;
  }

  async resendOtp(
    resendOtpInput: ResendOtpInput,
    language: LanguageCode = 'en',
    ipAddress?: string,
  ): Promise<boolean> {
    // Check rate limiting (allow only 1 OTP per minute)
    const recentOtp = await this.otpRepository.findOne({
      where: {
        target: resendOtpInput.target,
        type: resendOtpInput.type,
        createdAt: MoreThan(new Date(Date.now() - 60000)), // 1 minute ago
      },
    });

    if (recentOtp) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['TOO_MANY_OTP_REQUESTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Find user by target
    let user: User | null = null;
    if (resendOtpInput.type === OtpType.EMAIL_VERIFICATION) {
      user = await this.userRepository.findOne({
        where: { email: resendOtpInput.target },
      });
    } else if (resendOtpInput.type === OtpType.PHONE_VERIFICATION) {
      user = await this.userRepository.findOne({
        where: { phone: resendOtpInput.target },
      });
    }

    if (!user) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Generate and send new OTP
    await this.generateAndSendOtp(
      user.id,
      resendOtpInput.target,
      resendOtpInput.type,
      ipAddress,
    );

    return true;
  }

  async forgotPassword(
    forgotPasswordInput: ForgotPasswordInput,
    language: LanguageCode = 'en',
    ipAddress?: string,
  ): Promise<boolean> {
    // Find user by email or phone
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :identifier OR user.phone = :identifier', {
        identifier: forgotPasswordInput.emailOrPhone,
      })
      .getOne();

    if (!user) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Determine if it's email or phone
    const isEmail = forgotPasswordInput.emailOrPhone.includes('@');
    const target = isEmail ? user.email : user.phone;

    // Generate and send OTP
    await this.generateAndSendOtp(
      user.id,
      target,
      OtpType.PASSWORD_RESET,
      ipAddress,
    );

    return true;
  }

  async verifyPasswordResetOtp(
    verifyPasswordResetOtpInput: VerifyPasswordResetOtpInput,
    language: LanguageCode = 'en',
    ipAddress?: string,
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

    // Check attempt rate limiting (max 5 failed attempts per OTP)
    if (otp.attemptCount >= 5) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['TOO_MANY_OTP_ATTEMPTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if last attempt was less than 30 seconds ago (prevent brute force)
    if (otp.lastAttemptAt && otp.lastAttemptAt instanceof Date) {
      const timeSinceLastAttempt = Date.now() - otp.lastAttemptAt.getTime();
      if (timeSinceLastAttempt < 30000) {
        // 30 seconds
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['OTP_VERIFICATION_THROTTLED'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
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

    // Verify IP address matches (security check)
    if (otp.ipAddress && ipAddress && otp.ipAddress !== ipAddress) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['OTP_IP_MISMATCH'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Mark OTP as used
    otp.isUsed = true;
    await this.otpRepository.save(otp);

    // Issue a temporary reset token (short-lived, e.g., 15 minutes)
    const payload = { sub: otp.userId, type: 'password_reset' };
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
      // Verify and decode the reset token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload: any = this.jwtService.verify(
        resetPasswordWithTokenInput.resetToken,
      );

      // Ensure token is a password reset token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (payload.type !== 'password_reset') {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['INVALID_OTP'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Get user from token
      const user = await this.userRepository.findOne({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        where: { id: payload.sub },
      });

      if (!user) {
        const message = I18nService.translate(
          AUTH_ERROR_MESSAGES['USER_NOT_FOUND'],
          language,
        );
        throw new I18nNotFoundException({ en: message, ar: message }, language);
      }

      // Update password
      const hashedPassword = await bcrypt.hash(
        resetPasswordWithTokenInput.newPassword,
        10,
      );
      user.password = hashedPassword;
      await this.userRepository.save(user);

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

  async changePassword(
    userId: string,
    changePasswordInput: ChangePasswordInput,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      const message = I18nService.translate(
        AUTH_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      changePasswordInput.newPassword,
      10,
    );
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return true;
  }

  private async generateAndSendOtp(
    userId: string,
    target: string,
    type: OtpType,
    ipAddress?: string,
  ): Promise<void> {
    // TODO: Replace with actual 4-digit OTP generation in production
    const code = '1234';

    // Create OTP with 10 minutes expiration
    const otp = this.otpRepository.create({
      userId,
      target,
      type,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
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
      // Determine if target is email or phone
      if (target.includes('@')) {
        await this.emailService.sendPasswordResetEmail(target, code);
      } else {
        await this.smsService.sendPasswordResetSms(target, code);
      }
    }
  }

  async cleanupExpiredOtps(): Promise<void> {
    // Delete expired OTPs (older than 24 hours)
    await this.otpRepository.delete({
      expiresAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    });
  }
}
