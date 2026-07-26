import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { ReportExportQuery } from './dto/report-export.query';
import { ReportService } from './report.service';

@Controller('reports')
@UseGuards(AdminAuthGuard, AdminPermissionGuard)
@RequirePermission('report', 'read')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('conversation-fees/export')
  async conversationFees(
    @Query() query: ReportExportQuery,
    @Res() response: Response,
  ): Promise<void> {
    const { format, language, ...input } = query;
    this.send(
      response,
      await this.reportService.exportConversationFees(input, format, language),
      `conversation-fees.${format}`,
      format,
    );
  }

  @Get('premium-ads/export')
  async premiumAds(
    @Query() query: ReportExportQuery,
    @Res() response: Response,
  ): Promise<void> {
    const { format, language, ...input } = query;
    this.send(
      response,
      await this.reportService.exportPremiumAds(input, format, language),
      `premium-ad-fees.${format}`,
      format,
    );
  }

  @Get('contracts/export')
  async contracts(
    @Query() query: ReportExportQuery,
    @Res() response: Response,
  ): Promise<void> {
    const { format, language, ...input } = query;
    this.send(
      response,
      await this.reportService.exportContractFinancials(
        input,
        format,
        language,
      ),
      `contract-financials.${format}`,
      format,
    );
  }

  private send(
    response: Response,
    buffer: Buffer,
    filename: string,
    format: 'pdf' | 'xlsx',
  ): void {
    response.set({
      'Content-Type':
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    response.send(buffer);
  }
}
