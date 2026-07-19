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
import { FaqService } from './faq.service';
import { CsvExportService } from '../../lib/csv-export';
import { AdminExport } from '../admin/decorators/admin-export.decorator';

@ApiTags('FAQs', 'Export')
@Controller('faqs')
@AdminExport('faq')
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
    // Include all FAQs (admin view) for export
    const faqs = await this.faqService.findAll(true);

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    const language = acceptLanguage?.toLowerCase().startsWith('en')
      ? 'en'
      : 'ar';

    this.csvExportService.exportToCsv(
      faqs,
      `faqs-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
      language,
    );
  }
}
