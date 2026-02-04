import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ListingService } from './listing.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Listings', 'Export')
@Controller('listings')
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
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
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

    this.csvExportService.exportToCsv(
      listings,
      `listings-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
