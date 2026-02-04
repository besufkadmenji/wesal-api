import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { NotificationService } from './notification.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Notifications', 'Export')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export notifications to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,userId,title,message,isRead,createdAt',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.notificationService.findAll({
      page: 1,
      limit: 999999,
    });
    const notifications = result.items;

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      notifications,
      `notifications-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
