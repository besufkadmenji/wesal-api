import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentPurpose } from '../payment/enums/payment-purpose.enum';
import { FeeReportInput } from './dto/fee-report.input';
import {
  ConversationFeeReport,
  ConversationFeeReportRow,
  PremiumAdFeeReport,
  PremiumAdFeeReportRow,
} from './dto/fee-report.response';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async conversationFees(
    input: FeeReportInput,
  ): Promise<ConversationFeeReport> {
    const query = this.baseConversationQuery(input);
    const totalsRaw = await query
      .clone()
      .select(
        `COALESCE(SUM(CASE WHEN payment.purpose = '${PaymentPurpose.CHAT_CUSTOMER}' THEN payment.amount ELSE 0 END), 0)`,
        'customer',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN payment.purpose = '${PaymentPurpose.CHAT_PROVIDER}' THEN payment.amount ELSE 0 END), 0)`,
        'provider',
      )
      .getRawOne<{ customer: string; provider: string }>();
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const [payments, total] = await query
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items: payments.map((payment) => this.toConversationRow(payment)),
      meta: { total, page, limit },
      totalCustomerFees: Number(totalsRaw?.customer ?? 0),
      totalProviderFees: Number(totalsRaw?.provider ?? 0),
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
  ): Promise<Buffer> {
    const report = await this.conversationFees({
      ...input,
      page: 1,
      limit: 100000,
    });
    const headers = [
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
      item.createdAt.toISOString(),
    ]);
    return format === 'xlsx'
      ? this.xlsx('Conversation fees', headers, rows)
      : this.pdf('Conversation fees', headers, rows);
  }

  async exportPremiumAds(
    input: FeeReportInput,
    format: 'pdf' | 'xlsx',
  ): Promise<Buffer> {
    const report = await this.premiumAds({ ...input, page: 1, limit: 100000 });
    const headers = ['Listing', 'Provider', 'Phone', 'Status', 'Fee', 'Date'];
    const rows = report.items.map((item) => [
      item.listingName,
      item.providerName ?? '',
      item.providerPhone ?? '',
      item.status,
      item.fee,
      item.createdAt.toISOString(),
    ]);
    return format === 'xlsx'
      ? this.xlsx('Premium advertisement fees', headers, rows)
      : this.pdf('Premium advertisement fees', headers, rows);
  }

  private baseConversationQuery(
    input: FeeReportInput,
  ): SelectQueryBuilder<Payment> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.conversation', 'conversation')
      .leftJoinAndSelect('conversation.user', 'user')
      .leftJoinAndSelect('conversation.provider', 'provider')
      .where('payment.purpose IN (:...purposes)', {
        purposes: [PaymentPurpose.CHAT_CUSTOMER, PaymentPurpose.CHAT_PROVIDER],
      });
    this.applyCommonFilters(query, input);
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
    if (input.status) {
      query.andWhere('listing.status = :status', { status: input.status });
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
    if (input.categoryId) {
      query.andWhere('payment.categoryId = :categoryId', {
        categoryId: input.categoryId,
      });
    }
    if (input.from) {
      query.andWhere('payment.createdAt >= :from', { from: input.from });
    }
    if (input.to) {
      query.andWhere('payment.createdAt <= :to', { to: input.to });
    }
  }

  private toConversationRow(payment: Payment): ConversationFeeReportRow {
    const conversation = payment.conversation;
    return {
      paymentId: payment.id,
      conversationId: conversation?.id ?? payment.conversationId ?? '',
      customerName: conversation?.user?.name ?? null,
      providerName:
        conversation?.provider?.commercialName ??
        conversation?.provider?.name ??
        null,
      status: conversation?.status ?? 'UNKNOWN',
      customerFee:
        payment.purpose === PaymentPurpose.CHAT_CUSTOMER
          ? Number(payment.amount)
          : 0,
      providerFee:
        payment.purpose === PaymentPurpose.CHAT_PROVIDER
          ? Number(payment.amount)
          : 0,
      createdAt: payment.createdAt,
    };
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
      status: listing?.status ?? 'UNKNOWN',
      fee: Number(payment.amount),
      createdAt: payment.createdAt,
    };
  }

  private async xlsx(
    title: string,
    headers: string[],
    rows: Array<Array<string | number>>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(title.slice(0, 31));
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
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ margin: 36, size: 'A4' });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.fontSize(18).text(title);
      document.moveDown().fontSize(8).text(headers.join(' | '));
      for (const row of rows) document.text(row.join(' | '));
      document.end();
    });
  }
}
