import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FileUploadService } from '../file-upload';
import { AdminAuthGuard } from '../../src/admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../../src/admin/guards/admin-permission.guard';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { DataSource } from 'typeorm';

describe('AppController', () => {
  let appController: AppController;
  let fileUploadService: FileUploadService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AdminAuthGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: AdminPermissionGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: FileUploadService,
          useValue: {
            saveFile: jest.fn(),
            getFileWithMetadata: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    fileUploadService = app.get<FileUploadService>(FileUploadService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('uploadFile', () => {
    it('should upload a file', async () => {
      const mockFile = {
        buffer: Buffer.from('test content'),
        originalname: 'test.txt',
      };

      const mockResult = {
        filename: 'test-1234567890.txt',
        path: 'test-1234567890.txt',
        url: 'http://localhost:4000/uploads/test-1234567890.txt',
        size: 12,
      };

      const saveFile = jest
        .spyOn(fileUploadService, 'saveFile')
        .mockResolvedValue(mockResult);

      const result = await appController.uploadFile(
        mockFile as never,
        undefined,
      );

      expect(result).toEqual({
        filename: mockResult.filename,
        url: `/files/${mockResult.path}`,
        size: mockResult.size,
      });
      expect(saveFile).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        undefined,
      );
    });

    it('should throw error if no file provided', async () => {
      await expect(
        appController.uploadFile(undefined as never, undefined),
      ).rejects.toThrow();
    });
  });

  describe('uploadRegistrationFile (sign-up, no account yet)', () => {
    const file = {
      buffer: Buffer.from('%PDF-1.4'),
      originalname: 'commercial-registration.pdf',
      mimetype: 'application/pdf',
      size: 8,
    };
    const request = (ip: string) =>
      ({ headers: { 'x-forwarded-for': ip } }) as never;

    it('needs no login token', () => {
      /* eslint-disable @typescript-eslint/unbound-method -- reading decorator metadata */
      const guards = Reflect.getMetadata(
        '__guards__',
        AppController.prototype.uploadRegistrationFile,
      ) as unknown[] | undefined;
      expect(guards ?? []).toHaveLength(0);
      expect(
        Reflect.getMetadata('__guards__', AppController.prototype.uploadFile),
      ).toHaveLength(1);
      /* eslint-enable @typescript-eslint/unbound-method */
    });

    it('stores the file like a normal upload', async () => {
      jest.spyOn(fileUploadService, 'saveFile').mockResolvedValue({
        filename: 'abc.pdf',
        path: 'abc.pdf',
        url: '',
        size: 8,
      });
      await expect(
        appController.uploadRegistrationFile(file, request('203.0.113.1')),
      ).resolves.toEqual({
        filename: 'abc.pdf',
        url: '/files/abc.pdf',
        size: 8,
      });
    });

    it('refuses an IP after 10 uploads in an hour', async () => {
      jest.spyOn(fileUploadService, 'saveFile').mockResolvedValue({
        filename: 'abc.pdf',
        path: 'abc.pdf',
        url: '',
        size: 8,
      });
      for (let i = 0; i < 10; i += 1) {
        await appController.uploadRegistrationFile(
          file,
          request('203.0.113.9'),
        );
      }
      await expect(
        appController.uploadRegistrationFile(file, request('203.0.113.9')),
      ).rejects.toMatchObject({ status: 429 });
      // Other visitors are unaffected.
      await expect(
        appController.uploadRegistrationFile(file, request('203.0.113.10')),
      ).resolves.toBeDefined();
    });
  });

  describe('serveFile', () => {
    it('joins Express wildcard segments into the nested S3 key', async () => {
      const buffer = Buffer.from('image');
      const getFileWithMetadata = jest
        .spyOn(fileUploadService, 'getFileWithMetadata')
        .mockResolvedValue({ buffer, contentType: 'image/png' });
      const response = {
        set: jest.fn(),
        send: jest.fn(),
      };

      await appController.serveFile(
        ['complaints', 'user', 'customer-id', 'evidence.png'],
        response as never,
      );

      expect(getFileWithMetadata).toHaveBeenCalledWith(
        'complaints/user/customer-id/evidence.png',
      );
      expect(response.send).toHaveBeenCalledWith(buffer);
    });
  });
});
