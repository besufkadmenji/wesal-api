import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Admin } from '../entities/admin.entity';
import { AdminOtp } from '../entities/admin-otp.entity';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthResolver } from './admin-auth.resolver';
import { EmailService } from 'lib/email/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminOtp]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AdminAuthResolver, AdminAuthService, EmailService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
