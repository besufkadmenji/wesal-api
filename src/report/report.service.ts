import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  formatPdfDate,
  formatPdfNumber,
  registerPdfFont,
  shapePdfText,
} from '../common/pdf/pdf-text';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentPurpose } from '../payment/enums/payment-purpose.enum';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { FeeReportInput } from './dto/fee-report.input';
import {
  ConversationFeeReport,
  PremiumAdFeeReport,
  PremiumAdFeeReportRow,
  ContractFinancialReport,
  ContractFinancialReportRow,
} from './dto/fee-report.response';
import { ContractSettlementType } from '../contract/enums/contract-settlement-type.enum';
import {
  applyWatermark,
  drawLogo,
  PDF_BRAND,
  PDF_LOGO_PATH,
} from '../common/pdf/pdf-brand';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
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

  /**
   * BRD 4.3.22: one row per contract (drafts excluded), paid or not. Totals
   * cover every filtered contract, not just the current page.
   */
  async contractFinancials(
    input: FeeReportInput,
  ): Promise<ContractFinancialReport> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const base = this.baseContractQuery(input);
    const totals = await base
      .clone()
      .select('COUNT(contract.id)', 'count')
      .addSelect(
        `COUNT(contract.id) FILTER (WHERE contract.status = '${ContractStatus.COMPLETED}')`,
        'completed',
      )
      .addSelect('COALESCE(SUM(contract.providerNetAmount), 0)', 'providerNet')
      .addSelect('COALESCE(SUM(contract.vatAmount), 0)', 'vat')
      .addSelect('COALESCE(SUM(contract.commissionAmount), 0)', 'commission')
      .addSelect(
        'COALESCE(SUM(CASE WHEN contract.isCharity THEN 0 ELSE contract.commissionAmount END), 0)',
        'adminProfit',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN contract.isCharity THEN contract.charityAmount ELSE 0 END), 0)',
        'charity',
      )
      .addSelect('COALESCE(SUM(contract.totalPayable), 0)', 'contractTotal')
      .addSelect(
        'COALESCE(SUM(CASE WHEN contract.paidAt IS NOT NULL THEN contract.totalPayable ELSE 0 END), 0)',
        'paid',
      )
      .getRawOne<Record<string, string>>();
    const settlementTotals = await base
      .clone()
      .innerJoin('contract.settlements', 'settlement')
      .select(
        `COALESCE(SUM(CASE WHEN settlement.type = '${ContractSettlementType.CUSTOMER_REFUND}' THEN settlement.amount ELSE 0 END), 0)`,
        'refunds',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN settlement.type = '${ContractSettlementType.PROVIDER_RELEASE}' THEN settlement.amount ELSE 0 END), 0)`,
        'releases',
      )
      .getRawOne<Record<string, string>>();
    const contracts = await base
      .leftJoinAndSelect('contract.settlements', 'settlements')
      .orderBy('contract.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const total = (key: string, raw = totals) => Number(raw?.[key] ?? 0);
    return {
      items: contracts.map((contract) => this.toContractRow(contract)),
      meta: { total: total('count'), page, limit },
      completedCount: total('completed'),
      totalProviderNet: total('providerNet'),
      totalVat: total('vat'),
      totalCommission: total('commission'),
      totalAdminProfit: total('adminProfit'),
      totalCharity: total('charity'),
      totalContractValue: total('contractTotal'),
      totalPaid: total('paid'),
      totalCustomerRefunds: total('refunds', settlementTotals),
      totalProviderReleases: total('releases', settlementTotals),
    };
  }

  private baseContractQuery(input: FeeReportInput) {
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.client', 'client')
      .leftJoinAndSelect('contract.provider', 'provider')
      .where('contract.status != :draft', { draft: ContractStatus.DRAFT });
    if (input.from) {
      query.andWhere('contract.createdAt >= :from', { from: input.from });
    }
    if (input.to) {
      query.andWhere('contract.createdAt <= :to', { to: input.to });
    }
    if (input.categoryId) {
      query.andWhere('contract.categoryId = :categoryId', {
        categoryId: input.categoryId,
      });
    }
    if (input.deliveryCompanyId) {
      query.andWhere('contract.deliveryCompanyId = :deliveryCompanyId', {
        deliveryCompanyId: input.deliveryCompanyId,
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
    return query;
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
    const ar = language === 'ar';
    const headers = ar
      ? [
          '#',
          'رقم التعاقد',
          'تاريخ التعاقد',
          'العميل',
          'الاسم التجاري',
          'شركة التوصيل',
          'ربح مقدم الخدمة',
          'الضريبة',
          'ربح الإدارة',
          'إجمالي التعاقد',
        ]
      : [
          '#',
          'Contract no.',
          'Contract date',
          'Customer',
          'Trade name',
          'Delivery company',
          'Provider profit',
          'VAT',
          'Admin profit',
          'Contract total',
        ];
    const rows: Array<Array<string | number>> = report.items.map(
      (item, index) => [
        index + 1,
        String(item.contractNumber ?? item.contractId),
        item.createdAt.toISOString().slice(0, 10),
        item.customerName ?? '',
        item.providerName ?? '',
        (ar
          ? (item.deliveryCompanyNameAr ?? item.deliveryCompanyNameEn)
          : (item.deliveryCompanyNameEn ?? item.deliveryCompanyNameAr)) ?? '',
        item.providerNet,
        item.vat,
        item.adminProfit,
        item.contractTotal,
      ],
    );
    // BRD 4.3.22 footer: contract count, the three totals, completed count.
    rows.push([
      ar ? 'الإجمالي' : 'Total',
      report.meta.total,
      '',
      ar ? 'المكتملة' : 'Completed',
      report.completedCount,
      '',
      report.totalProviderNet,
      report.totalVat,
      report.totalAdminProfit,
      report.totalContractValue,
    ]);
    const title = ar ? 'التقرير المالي للتعاقدات' : 'Contract financial report';
    return format === 'xlsx'
      ? this.xlsx(title, headers, rows, language)
      : this.pdf(title, headers, rows, language, 1);
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
    // Abandoned or failed checkouts are not revenue (S4-10).
    query.andWhere('payment.status = :paidStatus', {
      paidStatus: PaymentStatus.COMPLETED,
    });
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

  private toContractRow(contract: Contract): ContractFinancialReportRow {
    const settlements = contract.settlements ?? [];
    const amountFor = (type: ContractSettlementType) =>
      settlements
        .filter((entry) => entry.type === type)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const commission = Number(contract.commissionAmount);
    return {
      contractId: contract.id,
      contractNumber: contract.publicId,
      status: contract.status,
      customerName: contract.client?.name ?? null,
      providerName:
        contract.provider?.commercialName ?? contract.provider?.name ?? null,
      deliveryCompanyName:
        contract.deliveryCompanyNameAr ?? contract.deliveryCompanyNameEn,
      deliveryCompanyNameAr: contract.deliveryCompanyNameAr,
      deliveryCompanyNameEn: contract.deliveryCompanyNameEn,
      providerNet: Number(contract.providerNetAmount),
      vat: Number(contract.vatAmount),
      commission,
      // The commission on charity contracts is donated, not kept (S4-32).
      adminProfit: contract.isCharity ? 0 : commission,
      isCharity: contract.isCharity,
      contractTotal: Number(contract.totalPayable),
      totalPaid: contract.paidAt ? Number(contract.totalPayable) : 0,
      customerRefund: amountFor(ContractSettlementType.CUSTOMER_REFUND),
      providerRelease: amountFor(ContractSettlementType.PROVIDER_RELEASE),
      createdAt: contract.createdAt,
    };
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

    // UI-15: a branded title block (logo, report name, generated at) above
    // the table; spreadsheets can't carry a real watermark.
    const logo = workbook.addImage({
      filename: PDF_LOGO_PATH,
      extension: 'png',
    });
    sheet.addImage(logo, {
      tl: { col: 0, row: 0 },
      ext: { width: 62, height: 48 },
    });
    sheet.getRow(1).height = 22;
    sheet.getRow(2).height = 22;
    const titleCell = sheet.getCell('B1');
    titleCell.value = title;
    titleCell.font = {
      bold: true,
      size: 16,
      color: { argb: 'FF22283A' },
    };
    const generated = sheet.getCell('B2');
    generated.value = new Intl.DateTimeFormat(
      language === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB',
      { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' },
    ).format(new Date());
    generated.font = { size: 10, color: { argb: 'FF667085' } };
    sheet.addRow([]);

    const headerRow = sheet.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF22283A' },
      };
      cell.alignment = { vertical: 'middle' };
    });
    for (const row of rows) sheet.addRow(row);
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
    totalRows = 0,
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

      // UI-15: brand palette, logo and a faint watermark on every page.
      const colors = PDF_BRAND;
      registerPdfFont(document);
      applyWatermark(document, { widthRatio: 0.34 });

      const rtl = language === 'ar';
      const shaped = shapePdfText;
      const align: PDFKit.Mixins.TextOptions['align'] = rtl ? 'right' : 'left';
      const margin = 32;
      const pageWidth = document.page.width;
      const pageHeight = document.page.height;
      const contentWidth = pageWidth - margin * 2;
      const tableBottom = pageHeight - 75;
      const displayHeaders = (rtl ? [...headers].reverse() : headers).map(
        shaped,
      );
      const displayRows = rows.map((row) => (rtl ? [...row].reverse() : row));
      const formattedRows = displayRows.map((row) =>
        row.map((value) => shaped(this.formatPdfCell(value, language))),
      );
      const columnWidths = this.pdfColumnWidths(
        displayHeaders,
        formattedRows,
        contentWidth,
      );
      const generatedAt = new Intl.DateTimeFormat(
        rtl ? 'ar-SA-u-nu-latn' : 'en-GB',
        {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Riyadh',
        },
      ).format(new Date());
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
        const logoHeight = 40;
        const logoWidth = logoHeight * 1.29;
        drawLogo(document, {
          x: rtl ? margin : pageWidth - margin - logoWidth,
          y: 20,
          height: logoHeight,
        });
        document
          .fillColor(colors.accent)
          .fontSize(22)
          .text(shaped(title), rtl ? margin + logoWidth + 12 : margin, 36, {
            align,
            lineBreak: false,
            width: contentWidth - logoWidth - 12,
          });
        document
          .fillColor(colors.muted)
          .fontSize(8)
          .text(
            shaped(
              `${labels.records}: ${(rows.length - totalRows).toLocaleString('en-US')}   |   ${labels.generated}: ${generatedAt}`,
            ),
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
          .text(shaped(labels.empty), margin + 18, y + 40, {
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
            shaped(`${labels.page} ${index + 1} / ${pageRange.count}`),
            margin,
            pageHeight - 56,
            { align: 'center', lineBreak: false, width: contentWidth },
          );
      }
      document.end();
    });
  }

  private formatPdfCell(value: string | number, language: 'ar' | 'en'): string {
    if (typeof value === 'number') return formatPdfNumber(value);
    const date = new Date(value);
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(date.getTime())) {
      return formatPdfDate(date, language);
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
