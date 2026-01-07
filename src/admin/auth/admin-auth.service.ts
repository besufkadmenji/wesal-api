import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'lib/email/email.service';
import { I18nBadRequestException, I18nNotFoundException } from 'lib/errors';
import { I18nService } from 'lib/i18n/i18n.service';
import type { LanguageCode } from 'lib/i18n/language.types';
import { MoreThan, Repository } from 'typeorm';
import { AdminOtp } from '../entities/admin-otp.entity';
import { OtpType } from '../../auth/enums/otp-type.enum';
import { AdminAuthResponse } from '../dto/admin-auth.response';
import { AdminChangePasswordInput } from '../dto/admin-change-password.input';
import { AdminForgotPasswordInput } from '../dto/admin-forgot-password.input';
import { AdminLoginInput } from '../dto/admin-login.input';
import { AdminResetPasswordInput } from '../dto/admin-reset-password.input';
import { VerifyAdminPasswordResetOtpInput } from '../dto/verify-admin-password-reset-otp.input';
import { VerifyAdminPasswordResetOtpResponse } from '../dto/verify-admin-password-reset-otp.response';
import { Admin } from '../entities/admin.entity';
import { AdminStatus } from '../enums/admin-status.enum';
import { ADMIN_ERROR_MESSAGES } from '../errors/admin.error-messages';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(AdminOtp)
    private readonly adminOtpRepository: Repository<AdminOtp>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async login(
    loginInput: AdminLoginInput,
    language: LanguageCode = 'en',
  ): Promise<AdminAuthResponse> {
    // Find admin by email
    const admin = await this.adminRepository.findOne({
      where: { email: loginInput.email },
    });

    if (!admin) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['INVALID_CREDENTIALS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginInput.password,
      admin.password || '',
    );
    if (!isPasswordValid) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['INVALID_CREDENTIALS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if admin is active
    if (admin.status !== AdminStatus.ACTIVE) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['INVALID_STATUS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Generate JWT token
    const payload = { sub: admin.id, email: admin.email };
    const accessToken: string = this.jwtService.sign(payload);

    return { accessToken, admin };
  }

  async getMe(adminId: string, language: LanguageCode = 'en'): Promise<Admin> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['ADMIN_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return admin;
  }

  async forgotPassword(
    forgotPasswordInput: AdminForgotPasswordInput,
    language: LanguageCode = 'en',
    ipAddress?: string,
  ): Promise<boolean> {
    // Find admin by email
    const admin = await this.adminRepository.findOne({
      where: { email: forgotPasswordInput.email },
    });

    if (!admin) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['ADMIN_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Generate and send OTP
    await this.generateAndSendOtp(
      admin.id,
      admin.email,
      OtpType.PASSWORD_RESET,
      ipAddress,
    );

    return true;
  }

  async verifyPasswordResetOtp(
    verifyInput: VerifyAdminPasswordResetOtpInput,
    language: LanguageCode = 'en',
    ipAddress?: string,
  ): Promise<VerifyAdminPasswordResetOtpResponse> {
    // Find valid OTP
    const otp = await this.adminOtpRepository.findOne({
      where: {
        target: verifyInput.email,
        type: OtpType.PASSWORD_RESET,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otp) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['INVALID_OTP'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check attempt rate limiting
    if (otp.attemptCount >= 5) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['TOO_MANY_OTP_ATTEMPTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Check if last attempt was less than 30 seconds ago
    if (otp.lastAttemptAt && otp.lastAttemptAt instanceof Date) {
      const timeSinceLastAttempt = Date.now() - otp.lastAttemptAt.getTime();
      if (timeSinceLastAttempt < 30000) {
        const message = I18nService.translate(
          ADMIN_ERROR_MESSAGES['OTP_VERIFICATION_THROTTLED'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    // Verify OTP code
    if (otp.code !== verifyInput.code) {
      otp.attemptCount += 1;
      otp.lastAttemptAt = new Date();
      await this.adminOtpRepository.save(otp);

      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['INVALID_OTP'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Verify IP address matches
    if (otp.ipAddress && ipAddress && otp.ipAddress !== ipAddress) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['OTP_IP_MISMATCH'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Mark OTP as used
    otp.isUsed = true;
    await this.adminOtpRepository.save(otp);

    // Issue temporary reset token
    const payload = { sub: otp.adminId, type: 'admin_password_reset' };
    const resetToken: string = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    return { resetToken };
  }

  async resetPassword(
    resetInput: AdminResetPasswordInput,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    try {
      // Verify and decode the reset token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload: any = this.jwtService.verify(resetInput.resetToken);

      // Ensure token is an admin password reset token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (payload.type !== 'admin_password_reset') {
        const message = I18nService.translate(
          ADMIN_ERROR_MESSAGES['INVALID_OTP'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }

      // Get admin from token
      const admin = await this.adminRepository.findOne({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        where: { id: payload.sub },
      });

      if (!admin) {
        const message = I18nService.translate(
          ADMIN_ERROR_MESSAGES['ADMIN_NOT_FOUND'],
          language,
        );
        throw new I18nNotFoundException({ en: message, ar: message }, language);
      }

      // Update password
      const hashedPassword = await bcrypt.hash(resetInput.newPassword, 10);
      admin.password = hashedPassword;
      await this.adminRepository.save(admin);

      return true;
    } catch (error) {
      if (
        error instanceof I18nBadRequestException ||
        error instanceof I18nNotFoundException
      ) {
        throw error;
      }

      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['INVALID_OTP'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }
  }

  async changePassword(
    adminId: string,
    changePasswordInput: AdminChangePasswordInput,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    // Find admin
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['ADMIN_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordInput.currentPassword,
      admin.password || '',
    );

    if (!isPasswordValid) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['INCORRECT_CURRENT_PASSWORD'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      changePasswordInput.newPassword,
      10,
    );
    admin.password = hashedPassword;
    await this.adminRepository.save(admin);

    return true;
  }

  private async generateAndSendOtp(
    adminId: string,
    target: string,
    type: OtpType,
    ipAddress?: string,
  ): Promise<void> {
    // TODO: Replace with actual 4-digit OTP generation in production
    const code = '1234';

    // Create OTP with 10 minutes expiration
    const otp = this.adminOtpRepository.create({
      adminId,
      target,
      type,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      isUsed: false,
      ipAddress,
      attemptCount: 0,
    });
    await this.adminOtpRepository.save(otp);

    // Send OTP via email
    if (type === OtpType.PASSWORD_RESET) {
      await this.emailService.sendPasswordResetEmail(target, code);
    }
  }
}
