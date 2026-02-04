import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PermissionService } from './permission.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Permissions', 'Export')
@Controller('permissions')
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export permissions to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,name,description,createdAt',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const permissions = await this.permissionService.findAll();

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      permissions,
      `permissions-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
