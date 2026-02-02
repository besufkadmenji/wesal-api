import { Req, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import type { Request } from 'express';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { Provider } from '../provider/entities/provider.entity';
import { CurrentUser } from './decorators/current-user.decorator';
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
import { VerifyChangeEmailInput } from './dto/verify-change-email.input';
import { VerifyChangePhoneInput } from './dto/verify-change-phone.input';
import { VerifyOtpInput } from './dto/verify-otp.input';
import { VerifyPasswordResetOtpInput } from './dto/verify-password-reset-otp.input';
import { VerifyPasswordResetOtpResponse } from './dto/verify-password-reset-otp.response';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ProviderAuthService } from './provider-auth.service';
import type { JwtPayload } from './strategies/jwt.strategy';

@Resolver()
export class ProviderAuthResolver {
  constructor(private readonly providerAuthService: ProviderAuthService) {}

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

  @Mutation(() => Provider, {
    description: 'Register a new provider and send verification OTPs',
  })
  async registerProvider(
    @Args('input') registerInput: RegisterProviderInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Provider> {
    return this.providerAuthService.register(registerInput, language);
  }

  @Mutation(() => ProviderAuthResponse, {
    description: 'Login as provider with email/phone and password',
  })
  async loginProvider(
    @Args('input') loginInput: LoginProviderInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<ProviderAuthResponse> {
    return this.providerAuthService.login(loginInput, language);
  }

  @Mutation(() => Boolean, {
    description: 'Verify provider email or phone with OTP',
  })
  async verifyProviderOtp(
    @Args('input') verifyOtpInput: VerifyOtpInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<boolean> {
    const ipAddress = this.getClientIp(request);
    return this.providerAuthService.verifyOtp(
      verifyOtpInput,
      language,
      ipAddress,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Resend OTP for provider email or phone verification',
  })
  async resendProviderOtp(
    @Args('input') resendOtpInput: ResendOtpInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<boolean> {
    const ipAddress = this.getClientIp(request);
    return this.providerAuthService.resendOtp(
      resendOtpInput,
      language,
      ipAddress,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Request password reset OTP for provider',
  })
  async forgotProviderPassword(
    @Args('input') forgotPasswordInput: ForgotPasswordInput,
  ): Promise<boolean> {
    return this.providerAuthService.forgotPassword(forgotPasswordInput);
  }

  @Mutation(() => VerifyPasswordResetOtpResponse, {
    description: 'Verify provider password reset OTP and get reset token',
  })
  async verifyProviderPasswordResetOtp(
    @Args('input') verifyPasswordResetOtpInput: VerifyPasswordResetOtpInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<VerifyPasswordResetOtpResponse> {
    return this.providerAuthService.verifyPasswordResetOtp(
      verifyPasswordResetOtpInput,
      language,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Reset provider password using reset token',
  })
  async resetProviderPassword(
    @Args('input') resetPasswordWithTokenInput: ResetPasswordWithTokenInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<boolean> {
    return this.providerAuthService.resetPassword(
      resetPasswordWithTokenInput,
      language,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Change password for authenticated provider',
  })
  async changeProviderPassword(
    @Args('input') changePasswordInput: ChangePasswordInput,
    @CurrentUser() user: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ): Promise<boolean> {
    if (!user) {
      throw new Error('Provider not authenticated');
    }
    return await this.providerAuthService.changePassword(
      user.sub,
      changePasswordInput,
      language,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => ChangeEmailResponse, {
    description:
      'Initiate provider email change - sends OTP to new email and returns change token',
  })
  async initiateProviderEmailChange(
    @Args('input') changeEmailInput: ChangeEmailInput,
    @CurrentUser() user: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ): Promise<ChangeEmailResponse> {
    if (!user) {
      throw new Error('Provider not authenticated');
    }
    return await this.providerAuthService.initiateEmailChange(
      user.sub,
      changeEmailInput,
      language,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Verify email change with OTP and change token',
  })
  async verifyProviderEmailChange(
    @Args('input') verifyChangeEmailInput: VerifyChangeEmailInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<boolean> {
    const ipAddress = this.getClientIp(request);
    return await this.providerAuthService.verifyEmailChange(
      verifyChangeEmailInput,
      language,
      ipAddress,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => ChangePhoneResponse, {
    description:
      'Initiate provider phone change - sends OTP to new phone and returns change token',
  })
  async initiateProviderPhoneChange(
    @Args('input') changePhoneInput: ChangePhoneInput,
    @CurrentUser() user: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ): Promise<ChangePhoneResponse> {
    if (!user) {
      throw new Error('Provider not authenticated');
    }
    return await this.providerAuthService.initiatePhoneChange(
      user.sub,
      changePhoneInput,
      language,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Verify phone change with OTP and change token',
  })
  async verifyProviderPhoneChange(
    @Args('input') verifyChangePhoneInput: VerifyChangePhoneInput,
    @GetLanguage() language: LanguageCode,
    @Req() request?: Request,
  ): Promise<boolean> {
    const ipAddress = this.getClientIp(request);
    return await this.providerAuthService.verifyPhoneChange(
      verifyChangePhoneInput,
      language,
      ipAddress,
    );
  }
}
