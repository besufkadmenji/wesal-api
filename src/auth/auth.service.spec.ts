import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { Otp } from './entities/otp.entity';
import { EmailService } from '../../lib/email/email.service';
import { SmsService } from '../../lib/sms/sms.service';
import { OtpType } from './enums/otp-type.enum';
import { UserRole } from '../user/enums/user-role.enum';

// Mock bcrypt before importing
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockOtpRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  const mockSmsService = {
    sendVerificationSms: jest.fn(),
    sendPasswordResetSms: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Otp),
          useValue: mockOtpRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and send OTPs', async () => {
      const registerInput = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        phone: '+1234567890',
        role: UserRole.USER,
      };

      const savedUser = {
        ...registerInput,
        id: '123',
        emailVerified: false,
        phoneVerified: false,
      };

      mockUserService.create.mockResolvedValue(savedUser);
      mockOtpRepository.create.mockReturnValue({});
      mockOtpRepository.save.mockResolvedValue({});
      mockEmailService.sendVerificationEmail.mockResolvedValue(true);
      mockSmsService.sendVerificationSms.mockResolvedValue(true);

      const result = await service.register(registerInput);

      expect(result).toBeDefined();
      expect(mockUserService.create).toHaveBeenCalledWith(registerInput, 'en');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
      expect(mockSmsService.sendVerificationSms).toHaveBeenCalled();
    });

    it('should throw error if user creation fails', async () => {
      const registerInput = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        phone: '+1234567890',
        role: UserRole.USER,
      };

      mockUserService.create.mockRejectedValue(
        new Error('User already exists'),
      );

      await expect(service.register(registerInput)).rejects.toThrow();
    });
  });

  describe('verifyOtp', () => {});

  describe('verifyOtp', () => {
    it('should verify OTP and update user verification status', async () => {
      const verifyInput = {
        target: 'john@example.com',
        code: '123456',
        type: OtpType.EMAIL_VERIFICATION,
      };

      const mockOtp = {
        userId: '123',
        target: verifyInput.target,
        code: verifyInput.code,
        type: verifyInput.type,
        isUsed: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      const mockUser = {
        id: '123',
        email: 'john@example.com',
        name: 'John Doe',
        emailVerified: false,
        phoneVerified: true,
      };

      mockOtpRepository.findOne.mockResolvedValue(mockOtp);
      mockOtpRepository.save.mockResolvedValue({ ...mockOtp, isUsed: true });
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });
      mockEmailService.sendWelcomeEmail.mockResolvedValue(true);

      const result = await service.verifyOtp(verifyInput);

      expect(result).toBe(true);
      expect(mockOtpRepository.save).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should throw error if OTP is invalid', async () => {
      const verifyInput = {
        target: 'john@example.com',
        code: '123456',
        type: OtpType.EMAIL_VERIFICATION,
      };

      mockOtpRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyOtp(verifyInput)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login user and return JWT token', async () => {
      const loginInput = {
        emailOrPhone: 'john@example.com',
        password: 'SecurePass123',
      };

      const mockUser = {
        id: '123',
        email: loginInput.emailOrPhone,
        password: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        role: UserRole.USER,
        emailVerified: true,
        phoneVerified: true,
      };

      mockUserRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginInput);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user).toBeDefined();
    });

    it('should throw error if credentials are invalid', async () => {
      const loginInput = {
        emailOrPhone: 'john@example.com',
        password: 'WrongPassword',
      };

      mockUserRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.login(loginInput)).rejects.toThrow();
    });
  });
});
