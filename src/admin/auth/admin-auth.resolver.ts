import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { Admin } from '../entities/admin.entity';
import { AdminAuthResponse } from '../dto/admin-auth.response';
import { AdminLoginInput } from '../dto/admin-login.input';
import { AdminForgotPasswordInput } from '../dto/admin-forgot-password.input';
import { VerifyAdminPasswordResetOtpInput } from '../dto/verify-admin-password-reset-otp.input';
import { VerifyAdminPasswordResetOtpResponse } from '../dto/verify-admin-password-reset-otp.response';
import { AdminResetPasswordInput } from '../dto/admin-reset-password.input';
import { AdminChangePasswordInput } from '../dto/admin-change-password.input';
import { GetLanguage } from 'lib/i18n/get-language.decorator';
import type { LanguageCode } from 'lib/i18n/language.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Resolver()
export class AdminAuthResolver {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Mutation(() => AdminAuthResponse)
  adminLogin(
    @Args('input') loginInput: AdminLoginInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminAuthService.login(loginInput, language);
  }

  @Query(() => Admin, { name: 'meAdmin' })
  @UseGuards(JwtAuthGuard)
  getMe(
    @CurrentAdmin() currentAdmin: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ) {
    if (!currentAdmin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.adminAuthService.getMe(currentAdmin.sub, language);
  }

  @Mutation(() => Boolean)
  adminForgotPassword(
    @Args('input') forgotPasswordInput: AdminForgotPasswordInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminAuthService.forgotPassword(forgotPasswordInput, language);
  }

  @Mutation(() => VerifyAdminPasswordResetOtpResponse)
  adminVerifyPasswordResetOtp(
    @Args('input') verifyInput: VerifyAdminPasswordResetOtpInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminAuthService.verifyPasswordResetOtp(verifyInput, language);
  }

  @Mutation(() => Boolean)
  adminResetPassword(
    @Args('input') resetInput: AdminResetPasswordInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.adminAuthService.resetPassword(resetInput, language);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  adminChangePassword(
    @CurrentAdmin() currentAdmin: JwtPayload | undefined,
    @Args('input') changePasswordInput: AdminChangePasswordInput,
    @GetLanguage() language: LanguageCode,
  ) {
    if (!currentAdmin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.adminAuthService.changePassword(
      currentAdmin.sub,
      changePasswordInput,
      language,
    );
  }
}
