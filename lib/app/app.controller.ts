import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileUploadService } from '../file-upload';
import { AppService } from './app.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { AdminExport } from '../../src/admin/decorators/admin-export.decorator';

@ApiTags('General', 'File Management')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Returns Hello World message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('exports/available')
  @AdminExport('report')
  @ApiOperation({ summary: 'Get list of all available export models' })
  @ApiResponse({
    status: 200,
    description: 'List of available export models with metadata',
    schema: {
      type: 'object',
      properties: {
        exports: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Display name of the model',
              },
              endpoint: { type: 'string', description: 'Export endpoint path' },
              model: { type: 'string', description: 'Internal model name' },
              description: {
                type: 'string',
                description: 'Brief description of the data',
              },
            },
          },
        },
        count: {
          type: 'number',
          description: 'Total number of available exports',
        },
      },
    },
  })
  getAvailableExports() {
    const exports = [
      {
        name: 'Users',
        endpoint: '/users/export',
        model: 'user',
        description: 'Export user accounts and profiles',
      },
      {
        name: 'Providers',
        endpoint: '/providers/export',
        model: 'provider',
        description: 'Export service provider accounts',
      },
      {
        name: 'Listings',
        endpoint: '/listings/export',
        model: 'listing',
        description: 'Export service listings and offerings',
      },
      {
        name: 'Categories',
        endpoint: '/categories/export',
        model: 'category',
        description: 'Export service categories',
      },
      {
        name: 'Cities',
        endpoint: '/cities/export',
        model: 'city',
        description: 'Export city data',
      },
      {
        name: 'Countries',
        endpoint: '/countries/export',
        model: 'country',
        description: 'Export country data',
      },
      {
        name: 'Banks',
        endpoint: '/banks/export',
        model: 'bank',
        description: 'Export banking institutions',
      },
      {
        name: 'Delivery Companies',
        endpoint: '/delivery-companies/export',
        model: 'delivery-company',
        description: 'Export delivery service providers',
      },
      {
        name: 'Contracts',
        endpoint: '/contracts/export',
        model: 'contract',
        description: 'Export contract records',
      },
      {
        name: 'Payments',
        endpoint: '/payments/export',
        model: 'payment',
        description: 'Export payment transactions',
      },
      {
        name: 'Ratings',
        endpoint: '/ratings/export',
        model: 'rating',
        description: 'Export user ratings and reviews',
      },
      {
        name: 'Complaints',
        endpoint: '/complaints/export',
        model: 'complaint',
        description: 'Export complaint records',
      },
      {
        name: 'Notifications',
        endpoint: '/notifications/export',
        model: 'notification',
        description: 'Export notification history',
      },
      {
        name: 'FAQs',
        endpoint: '/faqs/export',
        model: 'faq',
        description: 'Export frequently asked questions',
      },
      {
        name: 'Contact Messages',
        endpoint: '/contact-messages/export',
        model: 'contact-message',
        description: 'Export contact form submissions',
      },
      {
        name: 'Signed Contracts',
        endpoint: '/signed-contracts/export',
        model: 'signed-contract',
        description: 'Export signed contract documents',
      },
      {
        name: 'Favorites',
        endpoint: '/favorites/export',
        model: 'favorite',
        description: 'Export user favorite items',
      },
      {
        name: 'Conversations',
        endpoint: '/conversations/export',
        model: 'conversation',
        description: 'Export conversation threads',
      },
      {
        name: 'Tracking',
        endpoint: '/tracking/export',
        model: 'tracking',
        description: 'Export user activity tracking data',
      },
      {
        name: 'Admins',
        endpoint: '/admins/export',
        model: 'admin',
        description: 'Export admin user accounts',
      },
      {
        name: 'Permissions',
        endpoint: '/permissions/export',
        model: 'permission',
        description: 'Export permission definitions',
      },
      {
        name: 'Admin Permissions',
        endpoint: '/admin-permissions/export',
        model: 'admin-permission',
        description: 'Export admin permission assignments',
      },
      {
        name: 'Settings',
        endpoint: '/settings/export',
        model: 'setting',
        description: 'Export system settings',
      },
    ];

    return {
      exports,
      count: exports.length,
    };
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowed = new Set(['image/jpeg', 'image/png', 'video/mp4']);
        callback(
          allowed.has(file.mimetype)
            ? null
            : new BadRequestException('Unsupported file type'),
          allowed.has(file.mimetype),
        );
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
      },
    },
  })
  @ApiQuery({
    name: 'subfolder',
    required: false,
    description: 'Optional subfolder path for organizing uploaded files',
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Stored filename' },
        url: { type: 'string', description: 'File access URL' },
        size: { type: 'number', description: 'File size in bytes' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file' })
  async uploadFile(
    @UploadedFile()
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    @Query('subfolder') subfolder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.buffer || !file.originalname) {
      throw new BadRequestException('Invalid file format');
    }

    if (subfolder && !/^[a-z0-9/_-]+$/i.test(subfolder)) {
      throw new BadRequestException('Invalid subfolder');
    }

    try {
      const result = await this.fileUploadService.saveFile(
        file.buffer,
        file.originalname,
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
  @ApiOperation({ summary: 'Download a file as attachment' })
  @ApiParam({
    name: 'encodedPath',
    description: 'URL-encoded S3 key/path of the file to download',
  })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
    content: { 'application/octet-stream': {} },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 400, description: 'Download failed' })
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
  @ApiOperation({ summary: 'Serve a file inline (for embedding in pages)' })
  @ApiParam({
    name: 'encodedPath',
    description: 'URL-encoded S3 key/path of the file to serve',
  })
  @ApiResponse({
    status: 200,
    description: 'File served successfully with appropriate content type',
    content: {
      'image/*': {},
      'video/*': {},
      'application/pdf': {},
      'application/octet-stream': {},
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 400, description: 'File serving failed' })
  async serveFile(
    @Param('encodedPath') encodedPath: string,
    @Res() res: Response,
  ) {
    try {
      const s3Key = decodeURIComponent(encodedPath);

      const { buffer, contentType } =
        await this.fileUploadService.getFileWithMetadata(s3Key);

      res.set({
        'Content-Type': contentType ?? 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': buffer.length,
      });

      return res.send(buffer);
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
