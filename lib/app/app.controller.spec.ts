import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FileUploadService } from '../file-upload';

describe('AppController', () => {
  let appController: AppController;
  let fileUploadService: FileUploadService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
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

      jest.spyOn(fileUploadService, 'saveFile').mockResolvedValue(mockResult);

      const result = await appController.uploadFile(mockFile, undefined);

      expect(result).toEqual({
        filename: mockResult.filename,
        url: `/files/${encodeURIComponent(mockResult.path)}`,
        size: mockResult.size,
      });
      expect(fileUploadService.saveFile).toHaveBeenCalledWith(
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
