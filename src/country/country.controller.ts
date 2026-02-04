import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CountryService } from './country.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Countries', 'Export')
@Controller('countries')
export class CountryController {
  constructor(
    private readonly countryService: CountryService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export countries to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,nameEn,nameAr,dialCode',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.countryService.findAll({
      page: 1,
      limit: 999999,
    });
    const countries = result.items;

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      countries,
      `countries-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
