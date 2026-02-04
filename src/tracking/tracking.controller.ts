import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { TrackingService } from './tracking.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Tracking', 'Export')
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export tracking data to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,userId,targetType,targetId,actionType,count,createdAt',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const tracking = await this.trackingService.findAll();

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      tracking,
      `tracking-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
