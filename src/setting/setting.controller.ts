import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { SettingService } from './setting.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Settings', 'Export')
@Controller('settings')
export class SettingController {
  constructor(
    private readonly settingService: SettingService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export settings to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,appNameEn,appNameAr,contactEmail,contactPhone',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const settings = await this.settingService.findAll();

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      settings,
      `settings-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
