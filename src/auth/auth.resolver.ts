import { Req, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import type { Request } from 'express';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { User } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { JwtPayload } from './strategies/jwt.strategy';
import { AuthResponse } from './dto/auth-response';
import { ChangePasswordInput } from './dto/change-password.input';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { ResendOtpInput } from './dto/resend-otp.input';
import { ResetPasswordWithTokenInput } from './dto/reset-password-with-token.input';
import { VerifyOtpInput } from './dto/verify-otp.input';
import { VerifyPasswordResetOtpInput } from './dto/verify-password-reset-otp.input';
import { VerifyPasswordResetOtpResponse } from './dto/verify-password-reset-otp.response';
import { ChangeEmailInput } from './dto/change-email.input';
import { ChangeEmailResponse } from './dto/change-email.response';
import { ChangePhoneInput } from './dto/change-phone.input';
import { ChangePhoneResponse } from './dto/change-phone.response';
import { VerifyChangeEmailInput } from './dto/verify-change-email.input';
import { VerifyChangePhoneInput } from './dto/verify-change-phone.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  private getClientIp(request?: Request): string {
    if (!request) {
      return 'unknown';
    }
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.socket?.remoteAddress || 'unknown';
  }

  @Mutation(() => User, {
    description: 'Register a new user and send verification OTPs',
  })
  async register(
    @Args('input') registerInput: RegisterInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<User> {
    return this.authService.register(registerInput, language);
  }

  @Mutation(() => AuthResponse, {
    description: 'Login with email and password',
  })
  async login(
    @Args('input') loginInput: LoginInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<AuthResponse> {
    return this.authService.login(loginInput, language);
  }

  @Mutation(() => Boolean, {
    description: 'Verify email or phone with OTP',
  })
  async verifyOtp(
    @Args('input') verifyOtpInput: VerifyOtpInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<boolean> {
    const ipAddress = this.getClientIp(request);
    return this.authService.verifyOtp(verifyOtpInput, language, ipAddress);
  }

  @Mutation(() => Boolean, {
    description: 'Resend OTP for email or phone verification',
  })
  async resendOtp(
    @Args('input') resendOtpInput: ResendOtpInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<boolean> {
    const ipAddress = this.getClientIp(request);
    return this.authService.resendOtp(resendOtpInput, language, ipAddress);
  }

  @Mutation(() => Boolean, {
    description: 'Request password reset OTP',
  })
  async forgotPassword(
    @Args('input') forgotPasswordInput: ForgotPasswordInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<boolean> {
    const ipAddress = this.getClientIp(request);
    return this.authService.forgotPassword(
      forgotPasswordInput,
      language,
      ipAddress,
    );
  }

  @Mutation(() => VerifyPasswordResetOtpResponse, {
    description: 'Verify password reset OTP and get reset token',
  })
  async verifyPasswordResetOtp(
    @Args('input') verifyPasswordResetOtpInput: VerifyPasswordResetOtpInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<VerifyPasswordResetOtpResponse> {
    const ipAddress = this.getClientIp(request);
    return this.authService.verifyPasswordResetOtp(
      verifyPasswordResetOtpInput,
      language,
      ipAddress,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Reset password using reset token',
  })
  async resetPassword(
    @Args('input') resetPasswordWithTokenInput: ResetPasswordWithTokenInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<boolean> {
    return this.authService.resetPassword(
      resetPasswordWithTokenInput,
      language,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Change password for authenticated user',
  })
  async changePassword(
    @Args('input') changePasswordInput: ChangePasswordInput,
    @CurrentUser() user: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ): Promise<boolean> {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await this.authService.changePassword(
      user.sub,
      changePasswordInput,
      language,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => ChangeEmailResponse, {
    description:
      'Initiate email change - sends OTP to new email and returns change token',
  })
  async initiateEmailChange(
    @Args('input') changeEmailInput: ChangeEmailInput,
    @CurrentUser() user: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ): Promise<ChangeEmailResponse> {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await this.authService.initiateEmailChange(
      user.sub,
      changeEmailInput,
      language,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Verify email change with OTP and change token',
  })
  async verifyEmailChange(
    @Args('input') verifyChangeEmailInput: VerifyChangeEmailInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<boolean> {
    const ipAddress = this.getClientIp(request);
    return await this.authService.verifyEmailChange(
      verifyChangeEmailInput,
      language,
      ipAddress,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => ChangePhoneResponse, {
    description:
      'Initiate phone change - sends OTP to new phone and returns change token',
  })
  async initiatePhoneChange(
    @Args('input') changePhoneInput: ChangePhoneInput,
    @CurrentUser() user: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ): Promise<ChangePhoneResponse> {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await this.authService.initiatePhoneChange(
      user.sub,
      changePhoneInput,
      language,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Verify phone change with OTP and change token',
  })
  async verifyPhoneChange(
    @Args('input') verifyChangePhoneInput: VerifyChangePhoneInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<boolean> {
    const ipAddress = this.getClientIp(request);
    return await this.authService.verifyPhoneChange(
      verifyChangePhoneInput,
      language,
      ipAddress,
    );
  }
}
