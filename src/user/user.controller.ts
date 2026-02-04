import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UserService } from './user.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Users', 'Export')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({
    summary: 'Export users to CSV',
    description:
      'Export all user records to a CSV file with optional field selection',
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    description:
      'Comma-separated list of fields to export (e.g., "id,name,email,phone"). If not provided, all fields are exported.',
    example: 'id,name,email,phone,status,createdAt',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: 200,
    description: 'CSV file download',
    content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } },
  })
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.userService.findAll({ page: 1, limit: 999999 });
    const users = result.items;

    // Parse fields query parameter (comma-separated)
    const selectedFields = fields
      ? fields.split(',').map((f) => f.trim())
      : undefined;

    this.csvExportService.exportToCsv(
      users,
      `users-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
    );
  }
}
