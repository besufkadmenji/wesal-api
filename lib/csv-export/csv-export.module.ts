import { Global, Module } from '@nestjs/common';
import { CsvExportService } from './csv-export.service';

@Global()
@Module({
  providers: [CsvExportService],
  exports: [CsvExportService],
})
export class CsvExportModule {}
