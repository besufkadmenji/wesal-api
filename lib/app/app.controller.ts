import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../file-upload';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Query('subfolder') subfolder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!file.buffer || !file.originalname) {
      throw new BadRequestException('Invalid file format');
    }

    try {
      const result = await this.fileUploadService.saveFile(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        file.buffer as Buffer,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        file.originalname as string,
        subfolder,
      );

      return {
        filename: result.filename,
        url: result.url,
        size: result.size,
      };
    } catch (error) {
      throw new BadRequestException(
        `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
