import { Controller, Get, Query, Res, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ListingService } from './listing.service';
import { CsvExportService } from '../../lib/csv-export';
import { AdminExport } from '../admin/decorators/admin-export.decorator';

@ApiTags('Listings', 'Export')
@Controller('listings')
@AdminExport('listing')
export class ListingController {
  constructor(
    private readonly listingService: ListingService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export listings to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,name,price,categoryId,status',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description:
      'Language for CSV headers (ar = Arabic, en = English). Defaults to Arabic.',
    example: 'ar',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Headers('accept-language') acceptLanguage: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.listingService.findAll({
      page: 1,
      limit: 999999,
    });
    const listings = result.items;

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    const language = acceptLanguage?.toLowerCase().startsWith('en')
      ? 'en'
      : 'ar';

    this.csvExportService.exportToCsv(
      listings,
      `listings-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
      language,
    );
  }
}
