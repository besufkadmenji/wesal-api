import { Controller, Get, Post, UploadedFile, UseInterceptors, Query, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { FileUploadService } from '../file-upload';

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
  uploadFile(
    @UploadedFile() file: any,
    @Query('subfolder') subfolder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = this.fileUploadService.saveFile(
      file.buffer,
      file.originalname,
      subfolder,
    );

    return {
      filename: result.filename,
      url: result.url,
      size: result.size,
    };
  }
}
