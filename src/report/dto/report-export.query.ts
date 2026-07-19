import { IsIn } from 'class-validator';
import { FeeReportInput } from './fee-report.input';

export class ReportExportQuery extends FeeReportInput {
  @IsIn(['pdf', 'xlsx'])
  format: 'pdf' | 'xlsx';
}
