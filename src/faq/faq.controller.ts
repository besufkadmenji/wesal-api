import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { FaqService } from './faq.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('FAQs', 'Export')
@Controller('faqs')
export class FaqController {
  constructor(
    private readonly faqService: FaqService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export FAQs to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,questionEn,questionAr,answerEn,answerAr,isActive',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    // Include all FAQs (admin view) for export
    const faqs = await this.faqService.findAll(true);

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      faqs,
      `faqs-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
