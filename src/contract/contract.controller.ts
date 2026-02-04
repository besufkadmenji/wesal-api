import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ContractService } from './contract.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Contracts', 'Export')
@Controller('contracts')
export class ContractController {
  constructor(
    private readonly contractService: ContractService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export contracts to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,conversationId,userId,status,createdAt',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
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

    this.csvExportService.exportToCsv(
      contracts,
      `contracts-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
