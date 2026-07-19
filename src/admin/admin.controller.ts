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
import { AdminService } from './admin.service';
import { CsvExportService } from '../../lib/csv-export';
import { AdminExport } from './decorators/admin-export.decorator';

@ApiTags('Admins', 'Export')
@Controller('admins')
@AdminExport('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({
    summary: 'Export admins to CSV',
    description:
      'Export all admin records to a CSV file with optional field selection',
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    description:
      'Comma-separated list of fields to export (e.g., "id,name,email"). If not provided, all fields are exported.',
    example: 'id,name,email,role,isActive',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description:
      'Language for CSV headers (ar = Arabic, en = English). Defaults to Arabic.',
    example: 'ar',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: 200,
    description: 'CSV file download',
    content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } },
  })
  async export(
    @Query('fields') fields: string,
    @Headers('accept-language') acceptLanguage: string,
    @Res() res: Response,
  ): Promise<void> {
    // Get all admins without pagination
    const result = await this.adminService.findAll({ page: 1, limit: 999999 });
    const admins = result.items;

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    const language = acceptLanguage?.toLowerCase().startsWith('en')
      ? 'en'
      : 'ar';

    this.csvExportService.exportToCsv(
      admins,
      `admins-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
      language,
    );
  }
}
