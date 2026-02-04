import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CityService } from './city.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Cities', 'Export')
@Controller('cities')
export class CityController {
  constructor(
    private readonly cityService: CityService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export cities to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,nameEn,nameAr,countryId',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.cityService.findAll({ page: 1, limit: 999999 });
    const cities = result.items;

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      cities,
      `cities-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
