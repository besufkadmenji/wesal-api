import { IsIn, IsOptional } from 'class-validator';
import { FeeReportInput } from './fee-report.input';

export class ReportExportQuery extends FeeReportInput {
  @IsIn(['pdf', 'xlsx'])
  format: 'pdf' | 'xlsx';

  @IsOptional()
  @IsIn(['ar', 'en'])
  language?: 'ar' | 'en';
}
