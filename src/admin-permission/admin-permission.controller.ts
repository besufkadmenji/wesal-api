import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminPermissionService } from './admin-permission.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Admin Permissions', 'Export')
@Controller('admin-permissions')
export class AdminPermissionController {
  constructor(
    private readonly adminPermissionService: AdminPermissionService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export admin permissions to CSV' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,adminId,permissionId,createdAt',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const adminPermissions = await this.adminPermissionService.findAll();

    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      adminPermissions,
      `admin-permissions-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
