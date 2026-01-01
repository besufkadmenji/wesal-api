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
    it('should upload a file', () => {
      const mockFile = {
        buffer: Buffer.from('test content'),
        originalname: 'test.txt',
      };

      const mockResult = {
        filename: 'test-1234567890.txt',
        url: 'http://localhost:4000/uploads/test-1234567890.txt',
        size: 12,
      };

      jest.spyOn(fileUploadService, 'saveFile').mockReturnValue(mockResult);

      const result = appController.uploadFile(mockFile, undefined);

      expect(result).toEqual(mockResult);
      expect(fileUploadService.saveFile).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        undefined,
      );
    });

    it('should throw error if no file provided', () => {
      expect(() => appController.uploadFile(undefined, undefined)).toThrow();
    });
  });
});
