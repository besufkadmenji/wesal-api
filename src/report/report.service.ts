import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentPurpose } from '../payment/enums/payment-purpose.enum';
import { FeeReportInput } from './dto/fee-report.input';
import {
  ConversationFeeReport,
  PremiumAdFeeReport,
  PremiumAdFeeReportRow,
  ContractFinancialReport,
  ContractFinancialReportRow,
} from './dto/fee-report.response';
import { ContractSettlementType } from '../contract/enums/contract-settlement-type.enum';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async conversationFees(
    input: FeeReportInput,
  ): Promise<ConversationFeeReport> {
    const totalsRaw = await this.baseConversationQuery(input)
      .select('COUNT(DISTINCT conversation.id)', 'count')
      .addSelect(
        `COALESCE(SUM(CASE WHEN payment.purpose = '${PaymentPurpose.CHAT_CUSTOMER}' THEN payment.amount ELSE 0 END), 0)`,
        'customer',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN payment.purpose = '${PaymentPurpose.CHAT_PROVIDER}' THEN payment.amount ELSE 0 END), 0)`,
        'provider',
      )
      .getRawOne<{ count: string; customer: string; provider: string }>();
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const rows = await this.baseConversationQuery(input)
      .select('conversation.id', 'conversationId')
      .addSelect('conversation.publicId', 'conversationNumber')
      .addSelect('conversation.status', 'status')
      .addSelect('user.name', 'customerName')
      .addSelect('provider.commercialName', 'providerName')
      .addSelect('provider.phone', 'providerPhone')
      .addSelect('conversation.createdAt', 'startedAt')
      .addSelect('conversation.closedAt', 'endedAt')
      .addSelect(
        `COALESCE(SUM(CASE WHEN payment.purpose = '${PaymentPurpose.CHAT_CUSTOMER}' THEN payment.amount ELSE 0 END), 0)`,
        'customerFee',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN payment.purpose = '${PaymentPurpose.CHAT_PROVIDER}' THEN payment.amount ELSE 0 END), 0)`,
        'providerFee',
      )
      .groupBy('conversation.id')
      .addGroupBy('user.id')
      .addGroupBy('provider.id')
      .orderBy('MAX(payment.createdAt)', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany<{
        conversationId: string;
        conversationNumber: string | null;
        status: string;
        customerName: string | null;
        providerName: string | null;
        providerPhone: string | null;
        startedAt: Date;
        endedAt: Date | null;
        customerFee: string;
        providerFee: string;
      }>();
    const total = Number(totalsRaw?.count ?? 0);
    return {
      items: rows.map((row) => ({
        conversationId: row.conversationId,
        conversationNumber:
          row.conversationNumber == null
            ? null
            : Number(row.conversationNumber),
        status: row.status,
        customerName: row.customerName,
        providerName: row.providerName,
        providerPhone: row.providerPhone,
        startedAt: new Date(row.startedAt),
        endedAt: row.endedAt == null ? null : new Date(row.endedAt),
        customerFee: Number(row.customerFee),
        providerFee: Number(row.providerFee),
      })),
      meta: { total, page, limit },
      totalCustomerFees: Number(totalsRaw?.customer ?? 0),
      totalProviderFees: Number(totalsRaw?.provider ?? 0),
    };
  }

  async contractFinancials(
    input: FeeReportInput,
  ): Promise<ContractFinancialReport> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.contract', 'contract')
      .leftJoinAndSelect('contract.client', 'client')
      .leftJoinAndSelect('contract.provider', 'provider')
      .leftJoinAndSelect('contract.settlements', 'settlements')
      .where('payment.purpose = :contractPurpose', {
        contractPurpose: PaymentPurpose.CONTRACT,
      });
    this.applyCommonFilters(query, input);
    if (input.categoryId) {
      query.andWhere('contract.categoryId = :categoryId', {
        categoryId: input.categoryId,
      });
    }
    if (input.status) {
      query.andWhere('contract.status = :status', { status: input.status });
    }
    if (input.customerId) {
      query.andWhere('contract.clientId = :customerId', {
        customerId: input.customerId,
      });
    }
    if (input.providerId) {
      query.andWhere('contract.providerId = :providerId', {
        providerId: input.providerId,
      });
    }
    if (input.search?.trim()) {
      query.andWhere(
        `(contract."publicId"::text ILIKE :search OR client.name ILIKE :search
          OR provider."commercialName" ILIKE :search
          OR contract."deliveryCompanyNameEn" ILIKE :search
          OR contract."deliveryCompanyNameAr" ILIKE :search)`,
        { search: `%${input.search.trim()}%` },
      );
    }
    const payments = await query.orderBy('payment.createdAt', 'DESC').getMany();
    const rows = payments
      .filter((payment) => payment.contract)
      .map((payment) => this.toContractRow(payment));
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const items = rows.slice((page - 1) * limit, page * limit);
    return {
      items,
      meta: { total: rows.length, page, limit },
      completedCount: rows.filter((row) => row.status === 'COMPLETED').length,
      totalProviderNet: this.sum(rows, 'providerNet'),
      totalVat: this.sum(rows, 'vat'),
      totalCommission: this.sum(rows, 'commission'),
      totalPaid: this.sum(rows, 'totalPaid'),
      totalCustomerRefunds: this.sum(rows, 'customerRefund'),
      totalProviderReleases: this.sum(rows, 'providerRelease'),
    };
  }

  async premiumAds(input: FeeReportInput): Promise<PremiumAdFeeReport> {
    const query = this.basePremiumQuery(input);
    const totalRaw = await query
      .clone()
      .select('COALESCE(SUM(payment.amount), 0)', 'fees')
      .getRawOne<{ fees: string }>();
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const [payments, total] = await query
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items: payments.map((payment) => this.toPremiumRow(payment)),
      meta: { total, page, limit },
      totalFees: Number(totalRaw?.fees ?? 0),
    };
  }

  async exportConversationFees(
    input: FeeReportInput,
    format: 'pdf' | 'xlsx',
    language: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    const report = await this.conversationFees({
      ...input,
      page: 1,
      limit: 100000,
    });
    const headers =
      language === 'ar'
        ? [
            'المحادثة',
            'العميل',
            'مقدم الخدمة',
            'الحالة',
            'رسوم العميل',
            'رسوم مقدم الخدمة',
            'التاريخ',
          ]
        : [
            'Conversation',
            'Customer',
            'Provider',
            'Status',
            'Customer Fee',
            'Provider Fee',
            'Date',
          ];
    const rows = report.items.map((item) => [
      item.conversationId,
      item.customerName ?? '',
      item.providerName ?? '',
      item.status,
      item.customerFee,
      item.providerFee,
      item.startedAt.toISOString(),
    ]);
    return format === 'xlsx'
      ? this.xlsx(
          language === 'ar' ? 'رسوم المحادثات' : 'Conversation fees',
          headers,
          rows,
          language,
        )
      : this.pdf(
          language === 'ar' ? 'رسوم المحادثات' : 'Conversation fees',
          headers,
          rows,
          language,
        );
  }

  async exportContractFinancials(
    input: FeeReportInput,
    format: 'pdf' | 'xlsx',
    language: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    const report = await this.contractFinancials({
      ...input,
      page: 1,
      limit: 100000,
    });
    const headers =
      language === 'ar'
        ? [
            'التعاقد',
            'العميل',
            'مقدم الخدمة',
            'الحالة',
            'صافي مقدم الخدمة',
            'الضريبة',
            'العمولة',
            'المدفوع',
            'المسترد',
            'المحول لمقدم الخدمة',
            'التاريخ',
          ]
        : [
            'Contract',
            'Customer',
            'Provider',
            'Status',
            'Provider net',
            'VAT',
            'Commission',
            'Paid',
            'Refund',
            'Provider release',
            'Date',
          ];
    const rows = report.items.map((item) => [
      item.contractNumber ?? item.contractId,
      item.customerName ?? '',
      item.providerName ?? '',
      item.status,
      item.providerNet,
      item.vat,
      item.commission,
      item.totalPaid,
      item.customerRefund,
      item.providerRelease,
      item.createdAt.toISOString(),
    ]);
    return format === 'xlsx'
      ? this.xlsx(
          language === 'ar' ? 'ماليات التعاقدات' : 'Contract financials',
          headers,
          rows,
          language,
        )
      : this.pdf(
          language === 'ar' ? 'ماليات التعاقدات' : 'Contract financials',
          headers,
          rows,
          language,
        );
  }

  async exportPremiumAds(
    input: FeeReportInput,
    format: 'pdf' | 'xlsx',
    language: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    const report = await this.premiumAds({ ...input, page: 1, limit: 100000 });
    const headers =
      language === 'ar'
        ? ['الإعلان', 'مقدم الخدمة', 'الجوال', 'الحالة', 'الرسوم', 'التاريخ']
        : ['Listing', 'Provider', 'Phone', 'Status', 'Fee', 'Date'];
    const rows = report.items.map((item) => [
      item.listingName,
      item.providerName ?? '',
      item.providerPhone ?? '',
      item.status,
      item.fee,
      item.createdAt.toISOString(),
    ]);
    return format === 'xlsx'
      ? this.xlsx(
          language === 'ar'
            ? 'رسوم الإعلانات المميزة'
            : 'Premium advertisement fees',
          headers,
          rows,
          language,
        )
      : this.pdf(
          language === 'ar'
            ? 'رسوم الإعلانات المميزة'
            : 'Premium advertisement fees',
          headers,
          rows,
          language,
        );
  }

  private baseConversationQuery(
    input: FeeReportInput,
  ): SelectQueryBuilder<Payment> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.conversation', 'conversation')
      .leftJoinAndSelect('conversation.user', 'user')
      .leftJoinAndSelect('conversation.provider', 'provider')
      .leftJoinAndSelect('conversation.listing', 'listing')
      .where('payment.purpose IN (:...purposes)', {
        purposes: [PaymentPurpose.CHAT_CUSTOMER, PaymentPurpose.CHAT_PROVIDER],
      });
    this.applyCommonFilters(query, input);
    if (input.categoryId) {
      query.andWhere('listing.categoryId = :categoryId', {
        categoryId: input.categoryId,
      });
    }
    if (input.status) {
      query.andWhere('conversation.status = :status', { status: input.status });
    }
    if (input.customerId) {
      query.andWhere('conversation.userId = :customerId', {
        customerId: input.customerId,
      });
    }
    if (input.providerId) {
      query.andWhere('conversation.providerId = :providerId', {
        providerId: input.providerId,
      });
    }
    if (input.conversationId) {
      query.andWhere('conversation.id = :conversationId', {
        conversationId: input.conversationId,
      });
    }
    if (input.search?.trim()) {
      query.andWhere(
        '(user.name ILIKE :search OR provider.commercialName ILIKE :search OR conversation.publicId::text ILIKE :search)',
        { search: `%${input.search.trim()}%` },
      );
    }
    return query;
  }

  private basePremiumQuery(input: FeeReportInput): SelectQueryBuilder<Payment> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.listing', 'listing')
      .leftJoinAndSelect('listing.provider', 'provider')
      .where('payment.purpose = :purpose', {
        purpose: PaymentPurpose.PREMIUM_AD,
      });
    this.applyCommonFilters(query, input);
    if (input.categoryId) {
      query.andWhere('listing.categoryId = :categoryId', {
        categoryId: input.categoryId,
      });
    }
    if (input.status) {
      query.andWhere('listing.promotionStatus = :status', {
        status: input.status,
      });
    }
    if (input.providerId) {
      query.andWhere('listing.providerId = :providerId', {
        providerId: input.providerId,
      });
    }
    if (input.listingId) {
      query.andWhere('listing.id = :listingId', {
        listingId: input.listingId,
      });
    }
    if (input.search?.trim()) {
      query.andWhere(
        '(listing.name ILIKE :search OR provider.commercialName ILIKE :search OR provider.phone ILIKE :search)',
        { search: `%${input.search.trim()}%` },
      );
    }
    return query;
  }

  private applyCommonFilters(
    query: SelectQueryBuilder<Payment>,
    input: FeeReportInput,
  ): void {
    if (input.from) {
      query.andWhere('payment.createdAt >= :from', { from: input.from });
    }
    if (input.to) {
      query.andWhere('payment.createdAt <= :to', { to: input.to });
    }
  }

  private toPremiumRow(payment: Payment): PremiumAdFeeReportRow {
    const listing = payment.listing;
    return {
      paymentId: payment.id,
      listingId: listing?.id ?? payment.listingId ?? '',
      listingName: listing?.name ?? '',
      providerName:
        listing?.provider?.commercialName ?? listing?.provider?.name ?? null,
      providerPhone: listing?.provider?.phone ?? null,
      status: listing?.promotionStatus ?? 'UNKNOWN',
      fee: Number(payment.amount),
      createdAt: payment.createdAt,
      featuredStartsAt: listing?.featuredStartsAt ?? null,
      featuredEndsAt: listing?.featuredEndsAt ?? null,
    };
  }

  private toContractRow(payment: Payment): ContractFinancialReportRow {
    const contract = payment.contract!;
    const settlements = contract.settlements ?? [];
    const amountFor = (type: ContractSettlementType) =>
      settlements
        .filter((entry) => entry.type === type)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
    return {
      contractId: contract.id,
      contractNumber: contract.publicId,
      status: contract.status,
      customerName: contract.client?.name ?? null,
      providerName:
        contract.provider?.commercialName ?? contract.provider?.name ?? null,
      deliveryCompanyName:
        contract.deliveryCompanyNameAr ?? contract.deliveryCompanyNameEn,
      providerNet: Number(contract.providerNetAmount),
      vat: Number(contract.vatAmount),
      commission: Number(contract.commissionAmount),
      totalPaid: Number(payment.amount),
      customerRefund: amountFor(ContractSettlementType.CUSTOMER_REFUND),
      providerRelease: amountFor(ContractSettlementType.PROVIDER_RELEASE),
      createdAt: payment.createdAt,
    };
  }

  private sum(
    rows: ContractFinancialReportRow[],
    key:
      | 'providerNet'
      | 'vat'
      | 'commission'
      | 'totalPaid'
      | 'customerRefund'
      | 'providerRelease',
  ): number {
    return rows.reduce((total, row) => total + Number(row[key]), 0);
  }

  private async xlsx(
    title: string,
    headers: string[],
    rows: Array<Array<string | number>>,
    language: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(title.slice(0, 31));
    sheet.views = [{ rightToLeft: language === 'ar' }];
    sheet.addRow(headers);
    for (const row of rows) sheet.addRow(row);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column) => {
      column.width = 20;
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private pdf(
    title: string,
    headers: string[],
    rows: Array<Array<string | number>>,
    language: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        bufferPages: true,
        layout: 'landscape',
        margin: 32,
        size: 'A4',
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));

      const colors = {
        accent: '#2563EB',
        accentDark: '#1D4ED8',
        border: '#E5E7EB',
        ink: '#111827',
        muted: '#6B7280',
        soft: '#EFF6FF',
        stripe: '#F9FAFB',
        white: '#FFFFFF',
      };
      if (language === 'ar') {
        document.registerFont(
          'NotoArabic',
          path.join(
            process.cwd(),
            'node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff',
          ),
        );
        document.font('NotoArabic');
      }

      const rtl = language === 'ar';
      const align: PDFKit.Mixins.TextOptions['align'] = rtl ? 'right' : 'left';
      const margin = 32;
      const pageWidth = document.page.width;
      const pageHeight = document.page.height;
      const contentWidth = pageWidth - margin * 2;
      const tableBottom = pageHeight - 75;
      const displayHeaders = rtl ? [...headers].reverse() : headers;
      const displayRows = rows.map((row) => (rtl ? [...row].reverse() : row));
      const formattedRows = displayRows.map((row) =>
        row.map((value) => this.formatPdfCell(value, language)),
      );
      const columnWidths = this.pdfColumnWidths(
        displayHeaders,
        formattedRows,
        contentWidth,
      );
      const generatedAt = new Intl.DateTimeFormat(rtl ? 'ar-SA' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Riyadh',
      }).format(new Date());
      const labels = rtl
        ? {
            generated: 'تاريخ الإنشاء',
            page: 'صفحة',
            records: 'عدد السجلات',
            empty: 'لا توجد بيانات مطابقة لعوامل التصفية المحددة',
          }
        : {
            generated: 'Generated',
            page: 'Page',
            records: 'Records',
            empty: 'No records match the selected filters',
          };
      let y = 0;

      const drawHeader = () => {
        document.save().rect(0, 0, pageWidth, 8).fill(colors.accent).restore();
        document
          .fillColor(colors.accentDark)
          .fontSize(10)
          .text('WESAL', margin, 25, {
            align,
            characterSpacing: 1.2,
            width: contentWidth,
          });
        document.fillColor(colors.ink).fontSize(22).text(title, margin, 45, {
          align,
          lineBreak: false,
          width: contentWidth,
        });
        document
          .fillColor(colors.muted)
          .fontSize(8)
          .text(
            `${labels.records}: ${rows.length.toLocaleString(rtl ? 'ar-SA' : 'en-US')}   |   ${labels.generated}: ${generatedAt}`,
            margin,
            76,
            { align, width: contentWidth },
          );
        document
          .moveTo(margin, 94)
          .lineTo(pageWidth - margin, 94)
          .lineWidth(0.7)
          .strokeColor(colors.border)
          .stroke();
        y = 108;
      };

      const drawTableHeader = () => {
        const headerHeight = 30;
        document
          .save()
          .roundedRect(margin, y, contentWidth, headerHeight, 4)
          .fill(colors.accentDark)
          .restore();
        let x = margin;
        displayHeaders.forEach((header, index) => {
          const width = columnWidths[index];
          document
            .fillColor(colors.white)
            .fontSize(7)
            .text(header, x + 5, y + 8, {
              align,
              ellipsis: true,
              height: headerHeight - 12,
              lineBreak: false,
              width: width - 10,
            });
          x += width;
        });
        y += headerHeight;
      };

      const addPage = () => {
        document.addPage();
        drawHeader();
        drawTableHeader();
      };

      drawHeader();
      drawTableHeader();

      if (formattedRows.length === 0) {
        document
          .save()
          .roundedRect(margin, y + 12, contentWidth, 72, 6)
          .fill(colors.soft)
          .restore();
        document
          .fillColor(colors.muted)
          .fontSize(10)
          .text(labels.empty, margin + 18, y + 40, {
            align: 'center',
            width: contentWidth - 36,
          });
      }

      formattedRows.forEach((row, rowIndex) => {
        const cellHeights = row.map((value, index) =>
          document.heightOfString(value, {
            align,
            width: columnWidths[index] - 10,
          }),
        );
        const rowHeight = Math.max(
          25,
          Math.min(42, Math.max(...cellHeights) + 12),
        );
        if (y + rowHeight > tableBottom) addPage();

        if (rowIndex % 2 === 1) {
          document
            .save()
            .rect(margin, y, contentWidth, rowHeight)
            .fill(colors.stripe)
            .restore();
        }
        document
          .moveTo(margin, y + rowHeight)
          .lineTo(pageWidth - margin, y + rowHeight)
          .lineWidth(0.5)
          .strokeColor(colors.border)
          .stroke();

        let x = margin;
        row.forEach((value, columnIndex) => {
          const width = columnWidths[columnIndex];
          document
            .fillColor(colors.ink)
            .fontSize(7)
            .text(value, x + 5, y + 7, {
              align:
                typeof displayRows[rowIndex][columnIndex] === 'number'
                  ? 'right'
                  : align,
              ellipsis: true,
              height: rowHeight - 10,
              width: width - 10,
            });
          x += width;
        });
        y += rowHeight;
      });

      const pageRange = document.bufferedPageRange();
      for (let index = 0; index < pageRange.count; index += 1) {
        document.switchToPage(pageRange.start + index);
        document.x = 0;
        document.y = 0;
        document
          .moveTo(margin, pageHeight - 62)
          .lineTo(pageWidth - margin, pageHeight - 62)
          .lineWidth(0.5)
          .strokeColor(colors.border)
          .stroke();
        document
          .fillColor(colors.muted)
          .fontSize(7)
          .text(
            `${labels.page} ${index + 1} / ${pageRange.count}`,
            margin,
            pageHeight - 56,
            { align: 'center', lineBreak: false, width: contentWidth },
          );
      }
      document.end();
    });
  }

  private formatPdfCell(value: string | number, language: 'ar' | 'en'): string {
    if (typeof value === 'number') {
      return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
        maximumFractionDigits: 2,
      }).format(value);
    }
    const date = new Date(value);
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    }
    return value.replaceAll('_', ' ');
  }

  private pdfColumnWidths(
    headers: string[],
    rows: string[][],
    totalWidth: number,
  ): number[] {
    const weights = headers.map((header, index) => {
      const longestValue = rows.reduce(
        (longest, row) => Math.max(longest, row[index]?.length ?? 0),
        header.length,
      );
      return Math.min(18, Math.max(7, longestValue));
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return weights.map((weight) => (weight / totalWeight) * totalWidth);
  }
}
