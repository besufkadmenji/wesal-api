import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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

      // Build download URL that can be used in <img src> tags
      const filesUrl = `/files/${encodeURIComponent(result.path)}`;

      return {
        filename: result.filename,
        url: filesUrl,
        size: result.size,
      };
    } catch (error) {
      throw new BadRequestException(
        `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get('download/:encodedPath')
  async downloadFile(
    @Param('encodedPath') encodedPath: string,
    @Res() res: Response,
  ) {
    try {
      // Decode the S3 key from URL-encoded path
      const s3Key = decodeURIComponent(encodedPath);

      // Fetch file from S3
      const fileBuffer = await this.fileUploadService.getFile(s3Key);

      // Extract filename from path for Content-Disposition header
      const filename = s3Key.split('/').pop() || 'file';

      // Set response headers
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length,
      });

      res.send(fileBuffer);
    } catch (error) {
      if (error instanceof Error && error.message.includes('NoSuchKey')) {
        throw new NotFoundException('File not found');
      }
      throw new BadRequestException(
        `File download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get('files/:encodedPath')
  async serveFile(
    @Param('encodedPath') encodedPath: string,
    @Res() res: Response,
  ) {
    try {
      const s3Key = decodeURIComponent(encodedPath);

      // Check if it's a range request (for video streaming)
      const rangeHeader = res.req.headers.range;

      if (rangeHeader) {
        // Handle range request for video streaming
        const { contentType, contentLength } =
          await this.fileUploadService.getFileMetadata(s3Key);

        // Parse range header (e.g., "bytes=0-1023")
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
        const chunkSize = end - start + 1;

        // Get file stream with range
        const { stream } = await this.fileUploadService.getFileStream(s3Key, {
          start,
          end,
        });

        // Set partial content headers
        res.status(206);
        res.set({
          'Content-Type': contentType ?? 'application/octet-stream',
          'Content-Length': chunkSize,
          'Content-Range': `bytes ${start}-${end}/${contentLength}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        });

        // Pipe stream directly to response
        return new Promise((resolve, reject) => {
          stream.pipe(res);
          stream.on('end', resolve);
          stream.on('error', reject);
        });
      } else {
        // Non-range request - stream entire file
        const { stream, contentType, contentLength } =
          await this.fileUploadService.getFileStream(s3Key);

        res.set({
          'Content-Type': contentType ?? 'application/octet-stream',
          'Content-Disposition': 'inline',
          'Content-Length': contentLength,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        });

        // Pipe stream directly to response
        return new Promise((resolve, reject) => {
          stream.pipe(res);
          stream.on('end', resolve);
          stream.on('error', reject);
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('NoSuchKey')) {
        throw new NotFoundException('File not found');
      }
      throw new BadRequestException(
        `File serving failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
