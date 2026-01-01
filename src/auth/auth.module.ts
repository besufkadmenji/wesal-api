import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { User } from '../user/entities/user.entity';
import { Otp } from './entities/otp.entity';
import { UserModule } from '../user/user.module';
import { EmailService } from '../../lib/email/email.service';
import { SmsService } from '../../lib/sms/sms.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Otp]),
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresIn:
            configService.get<string>('JWT_EXPIRES_IN') || ('7d' as any),
        },
      }),
    }),
  ],
  providers: [
    AuthResolver,
    AuthService,
    EmailService,
    SmsService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, EmailService, SmsService, JwtAuthGuard],
})
export class AuthModule {}
