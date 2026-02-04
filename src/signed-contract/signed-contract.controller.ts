import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { SignedContractService } from './signed-contract.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Signed Contracts', 'Export')
@Controller('signed-contracts')
export class SignedContractController {
  constructor(
    private readonly signedContractService: SignedContractService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export signed contracts to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,userId,providerId,fileUrl,signedAt,createdAt',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.signedContractService.findAll({
      page: 1,
      limit: 999999,
    });
    const signedContracts = result.items;

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      signedContracts,
      `signed-contracts-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
