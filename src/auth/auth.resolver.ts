import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { VerifyOtpInput } from './dto/verify-otp.input';
import { ResendOtpInput } from './dto/resend-otp.input';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { AuthResponse } from './dto/auth-response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';

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

  @Mutation(() => Boolean, {
    description: 'Reset password using OTP',
  })
  async resetPassword(
    @Args('input') resetPasswordInput: ResetPasswordInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<boolean> {
    return this.authService.resetPassword(resetPasswordInput, language);
  }
}
