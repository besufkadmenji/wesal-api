import { Controller, Get, Res, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UserService } from './user.service';
import { CsvExportService } from '../../lib/csv-export';

// Fields exported in the users Excel/CSV file
const USER_EXPORT_FIELDS = ['name', 'phone', 'email', 'avatarFilename'];

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
      'Export user records to a CSV file containing: Username, Mobile Number, Email Address, and Profile Picture.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description:
      'Language for CSV headers (ar = Arabic, en = English). Defaults to Arabic (ar).',
    example: 'ar',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: 200,
    description: 'CSV file download with localized headers',
    content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } },
  })
  async export(
    @Headers('accept-language') acceptLanguage: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.userService.findAll({ page: 1, limit: 999999 });
    const users = result.items;

    // Parse language from Accept-Language header (default to Arabic)
    const language = acceptLanguage?.toLowerCase().startsWith('en')
      ? 'en'
      : 'ar';

    this.csvExportService.exportToCsv(
      users,
      `users-export-${new Date().toISOString().split('T')[0]}`,
      res,
      USER_EXPORT_FIELDS,
      language,
    );
  }
}
