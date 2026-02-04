import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ComplaintService } from './complaint.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Complaints', 'Export')
@Controller('complaints')
export class ComplaintController {
  constructor(
    private readonly complaintService: ComplaintService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export complaints to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,userId,listingId,reason,status,createdAt',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.complaintService.findAll({
      page: 1,
      limit: 999999,
    });
    const complaints = result.items;

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      complaints,
      `complaints-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
