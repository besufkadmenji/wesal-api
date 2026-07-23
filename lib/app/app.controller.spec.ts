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

      const result = await appController.uploadFile(mockFile, undefined);

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
        appController.uploadFile(undefined, undefined),
      ).rejects.toThrow();
    });
  });
});
