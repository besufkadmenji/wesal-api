import { Controller, Get, Query, Res, Headers, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ContractService } from './contract.service';
import { CsvExportService } from '../../lib/csv-export';
import { AdminExport } from '../admin/decorators/admin-export.decorator';
import { ContractDocumentService } from './contract-document.service';
import { ContractInvoiceService } from './contract-invoice.service';

@ApiTags('Contracts', 'Export')
@Controller('contracts')
@AdminExport('contract')
export class ContractController {
  constructor(
    private readonly contractService: ContractService,
    private readonly csvExportService: CsvExportService,
    private readonly documents: ContractDocumentService,
    private readonly invoices: ContractInvoiceService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export contracts to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,conversationId,userId,status,createdAt',
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
    const result = await this.contractService.findAll({
      page: 1,
      limit: 999999,
    });
    const contracts = result.items;

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    const language = acceptLanguage?.toLowerCase().startsWith('en')
      ? 'en'
      : 'ar';

    this.csvExportService.exportToCsv(
      contracts,
      `contracts-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
      language,
    );
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Tax invoice PDF for a paid contract (S4-37)' })
  @ApiQuery({ name: 'language', required: false, enum: ['ar', 'en'] })
  @ApiProduces('application/pdf')
  async invoice(
    @Param('id') id: string,
    @Query('language') language: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const { buffer, number } = await this.invoices.render(
      id,
      language === 'en' ? 'en' : 'ar',
    );
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${number}.pdf"`,
      'Content-Length': buffer.length,
    });
    response.send(buffer);
  }

  @Get(':id/document')
  async document(
    @Param('id') id: string,
    @Res() response: Response,
  ): Promise<void> {
    const buffer = await this.documents.forAdmin(id);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contract-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    response.send(buffer);
  }
}
