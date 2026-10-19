import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { I18nConflictException, I18nNotFoundException } from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Category } from '../category/entities/category.entity';
import {
  formatPdfDate,
  formatPdfNumber,
  registerPdfFont,
  shapePdfText,
} from '../common/pdf/pdf-text';
import { Setting } from '../setting/entities/setting.entity';
import { SettingService } from '../setting/setting.service';
import { Contract } from './entities/contract.entity';
import { ContractStatus } from './enums/contract-status.enum';
import { CONTRACT_ERROR_CODES } from './errors/contract.error-codes';
import { CONTRACT_ERROR_MESSAGES } from './errors/contract.error-messages';

type Language = 'ar' | 'en';

const COPY = {
  en: {
    title: 'Tax invoice',
    number: 'Invoice no.',
    date: 'Invoice date',
    contract: 'Contract no.',
    seller: 'Seller',
    buyer: 'Bill to',
    provider: 'Service provider',
    vatNumber: 'VAT number',
    crNumber: 'Commercial registration',
    description: 'Description',
    qty: 'Qty',
    unitPrice: 'Unit price (SAR)',
    vatRate: 'VAT %',
    vat: 'VAT (SAR)',
    total: 'Total (SAR)',
    subtotal: 'Subtotal (excl. VAT)',
    vatTotal: 'VAT',
    due: 'Total (SAR)',
    paidOn: 'Paid on',
    note: 'Internal invoice issued by the Wesal platform. It is not a ZATCA e-invoice.',
  },
  ar: {
    title: 'فاتورة ضريبية',
    number: 'رقم الفاتورة',
    date: 'تاريخ الفاتورة',
    contract: 'رقم التعاقد',
    seller: 'البائع',
    buyer: 'فاتورة إلى',
    provider: 'مقدم الخدمة',
    vatNumber: 'الرقم الضريبي',
    crNumber: 'السجل التجاري',
    description: 'الوصف',
    qty: 'الكمية',
    unitPrice: 'سعر الوحدة (ر.س)',
    vatRate: 'نسبة الضريبة',
    vat: 'الضريبة (ر.س)',
    total: 'الإجمالي (ر.س)',
    subtotal: 'المجموع قبل الضريبة',
    vatTotal: 'ضريبة القيمة المضافة',
    due: 'الإجمالي (ر.س)',
    paidOn: 'تاريخ السداد',
    note: 'فاتورة داخلية صادرة عن منصة وصال، وليست فاتورة إلكترونية لدى هيئة الزكاة والضريبة والجمارك.',
  },
} as const;

const COLORS = {
  accent: '#2563EB',
  accentDark: '#1D4ED8',
  border: '#E5E7EB',
  ink: '#111827',
  muted: '#6B7280',
  soft: '#EFF6FF',
};

/**
 * S4-37: internal tax invoice for a paid contract, addressed to the customer
 * (PO D-9: no ZATCA integration). Built from the contract's frozen
 * financial snapshot, so it never changes with later category edits.
 */
@Injectable()
export class ContractInvoiceService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly settingService: SettingService,
  ) {}

  static invoiceNumber(contract: Pick<Contract, 'publicId' | 'id'>): string {
    return `INV-${contract.publicId ?? contract.id}`;
  }

  /** S4-57: the paying customer downloads their own invoice on the web. */
  async forCustomer(
    contractId: string,
    principal: JwtPayload,
    language: Language,
  ): Promise<{ buffer: Buffer; number: string }> {
    const owner = await this.contractRepository.findOne({
      where: { id: contractId },
      select: { id: true, clientId: true },
    });
    if (!owner) throw this.error('CONTRACT_NOT_FOUND', language, true);
    if (principal.type !== 'user' || principal.sub !== owner.clientId) {
      throw new ForbiddenException();
    }
    return this.render(contractId, language);
  }

  async render(
    contractId: string,
    language: Language,
  ): Promise<{ buffer: Buffer; number: string }> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['conversation', 'conversation.listing', 'client', 'provider'],
    });
    if (!contract) throw this.error('CONTRACT_NOT_FOUND', language, true);
    if (!contract.paidAt || contract.status === ContractStatus.DRAFT) {
      throw this.error('INVOICE_NOT_AVAILABLE', language);
    }
    const [category, setting] = await Promise.all([
      this.categoryRepository.findOne({ where: { id: contract.categoryId } }),
      this.settingService.getSetting(),
    ]);
    const number = ContractInvoiceService.invoiceNumber(contract);
    const buffer = await this.draw(contract, category, setting, language);
    return { buffer, number };
  }

  private draw(
    contract: Contract,
    category: Category | null,
    setting: Setting,
    language: Language,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const rtl = language === 'ar';
      const copy = COPY[language];
      const document = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Wesal ${ContractInvoiceService.invoiceNumber(contract)}`,
        },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));
      registerPdfFont(document);

      const margin = 40;
      const pageWidth = document.page.width;
      const contentWidth = pageWidth - margin * 2;
      const align = rtl ? 'right' : 'left';
      const text = (
        value: string,
        x: number,
        y: number,
        width: number,
        options: {
          size?: number;
          color?: string;
          align?: 'left' | 'right' | 'center';
        } = {},
      ) =>
        document
          .fillColor(options.color ?? COLORS.ink)
          .fontSize(options.size ?? 9)
          .text(value.split('\n').map(shapePdfText).join('\n'), x, y, {
            width,
            align: options.align ?? align,
            lineBreak: true,
          });
      const money = (value: number) => formatPdfNumber(Number(value), 2);
      const paidAt = contract.paidAt!;

      // Header
      document.save().rect(0, 0, pageWidth, 8).fill(COLORS.accent).restore();
      text('WESAL', margin, 26, contentWidth, {
        size: 10,
        color: COLORS.accentDark,
      });
      text(copy.title, margin, 42, contentWidth, { size: 22 });
      const metaWidth = contentWidth / 3;
      const meta: Array<[string, string]> = [
        [copy.number, ContractInvoiceService.invoiceNumber(contract)],
        [copy.date, formatPdfDate(paidAt, language, { dateStyle: 'medium' })],
        [copy.contract, String(contract.publicId ?? contract.id)],
      ];
      (rtl ? [...meta].reverse() : meta).forEach(([label, value], index) => {
        const x = margin + index * metaWidth;
        text(label, x, 84, metaWidth - 8, { size: 8, color: COLORS.muted });
        text(value, x, 96, metaWidth - 8, { size: 10 });
      });
      document
        .moveTo(margin, 120)
        .lineTo(pageWidth - margin, 120)
        .lineWidth(0.7)
        .strokeColor(COLORS.border)
        .stroke();

      // Parties
      const partyWidth = contentWidth / 2 - 10;
      const sellerName = rtl
        ? (setting.sellerLegalNameAr ?? setting.sellerLegalNameEn)
        : (setting.sellerLegalNameEn ?? setting.sellerLegalNameAr);
      const seller = [
        sellerName ?? (rtl ? 'منصة وصال' : 'Wesal platform'),
        setting.sellerVatNumber
          ? `${copy.vatNumber}: ${setting.sellerVatNumber}`
          : null,
        setting.sellerCrNumber
          ? `${copy.crNumber}: ${setting.sellerCrNumber}`
          : null,
        setting.sellerAddress,
        setting.email,
        setting.phones?.[0],
      ];
      const client = contract.client;
      const buyer = [
        client?.name,
        client?.phone ? `${client.dialCode ?? ''}${client.phone}` : null,
        client?.email,
        contract.customerAddress,
      ];
      const blocks: Array<[string, Array<string | null | undefined>]> = [
        [copy.seller, seller],
        [copy.buyer, buyer],
      ];
      let partiesBottom = 0;
      (rtl ? [...blocks].reverse() : blocks).forEach(
        ([title, lines], index) => {
          const x = margin + index * (partyWidth + 20);
          let y = 136;
          text(title, x, y, partyWidth, { size: 8, color: COLORS.muted });
          y += 14;
          for (const line of lines) {
            if (!line?.trim()) continue;
            text(line, x, y, partyWidth, { size: 10 });
            y = document.y + 2;
          }
          partiesBottom = Math.max(partiesBottom, y);
        },
      );

      let y = partiesBottom + 10;
      const provider = contract.provider;
      const providerName = provider?.commercialName ?? provider?.name ?? '';
      text(copy.provider, margin, y, contentWidth, {
        size: 8,
        color: COLORS.muted,
      });
      y += 13;
      text(providerName, margin, y, contentWidth, { size: 10 });
      y = document.y + 2;
      if (provider?.commercialRegistrationNumber) {
        text(
          `${copy.crNumber}: ${provider.commercialRegistrationNumber}`,
          margin,
          y,
          contentWidth,
          { size: 9, color: COLORS.muted },
        );
        y = document.y + 2;
      }

      // Line table
      y += 14;
      // Listing and category on separate lines: one pdfkit run can't mix
      // Latin and Arabic words.
      const description = [
        contract.conversation?.listing?.name,
        category ? (rtl ? category.nameAr : category.nameEn) : null,
      ]
        .filter(Boolean)
        .join('\n');
      const vatRate = Number(contract.vatRate);
      const columns: Array<[string, string, number, 'left' | 'right']> = [
        [copy.description, description || '-', 0.3, align],
        [copy.qty, '1', 0.08, 'right'],
        [copy.unitPrice, money(contract.agreedPrice), 0.16, 'right'],
        [copy.vatRate, `${formatPdfNumber(vatRate)}%`, 0.14, 'right'],
        [copy.vat, money(contract.vatAmount), 0.14, 'right'],
        [copy.total, money(contract.totalPayable), 0.18, 'right'],
      ];
      const ordered = rtl ? [...columns].reverse() : columns;
      document
        .save()
        .roundedRect(margin, y, contentWidth, 26, 4)
        .fill(COLORS.accentDark)
        .restore();
      let x = margin;
      for (const [header, , share, cellAlign] of ordered) {
        const width = contentWidth * share;
        text(header, x + 6, y + 8, width - 12, {
          size: 8,
          color: '#FFFFFF',
          align: cellAlign,
        });
        x += width;
      }
      y += 26;
      x = margin;
      let rowBottom = y + 28;
      for (const [, value, share, cellAlign] of ordered) {
        const width = contentWidth * share;
        text(value, x + 6, y + 9, width - 12, { size: 9, align: cellAlign });
        rowBottom = Math.max(rowBottom, document.y + 9);
        x += width;
      }
      document
        .moveTo(margin, rowBottom)
        .lineTo(pageWidth - margin, rowBottom)
        .lineWidth(0.5)
        .strokeColor(COLORS.border)
        .stroke();

      // Totals, on the reading-end side
      y = rowBottom + 16;
      const totalsWidth = contentWidth * 0.45;
      const totalsX = rtl ? margin : margin + contentWidth - totalsWidth;
      const totals: Array<[string, string, boolean]> = [
        [copy.subtotal, money(contract.agreedPrice), false],
        [
          `${copy.vatTotal} (${formatPdfNumber(vatRate)}%)`,
          money(contract.vatAmount),
          false,
        ],
        [copy.due, money(contract.totalPayable), true],
      ];
      for (const [label, value, strong] of totals) {
        if (strong) {
          document
            .save()
            .roundedRect(totalsX, y - 4, totalsWidth, 24, 4)
            .fill(COLORS.soft)
            .restore();
        }
        const labelWidth = totalsWidth * 0.6;
        const valueWidth = totalsWidth - labelWidth;
        const labelX = rtl ? totalsX + valueWidth : totalsX;
        const valueX = rtl ? totalsX : totalsX + labelWidth;
        text(label, labelX + 6, y + 2, labelWidth - 12, {
          size: strong ? 10 : 9,
        });
        text(value, valueX + 6, y + 2, valueWidth - 12, {
          size: strong ? 11 : 9,
          align: 'right',
        });
        y += 26;
      }
      text(copy.paidOn, totalsX + 6, y + 2, totalsWidth - 12, {
        size: 8,
        color: COLORS.muted,
      });
      text(
        formatPdfDate(paidAt, language),
        totalsX + 6,
        y + 14,
        totalsWidth - 12,
        { size: 9 },
      );

      // Footer
      const footerY = document.page.height - 70;
      document
        .moveTo(margin, footerY)
        .lineTo(pageWidth - margin, footerY)
        .lineWidth(0.5)
        .strokeColor(COLORS.border)
        .stroke();
      text(copy.note, margin, footerY + 8, contentWidth, {
        size: 8,
        color: COLORS.muted,
        align: 'center',
      });
      document.end();
    });
  }

  private error(
    code: keyof typeof CONTRACT_ERROR_CODES,
    language: Language,
    notFound = false,
  ) {
    const message = I18nService.translate(
      CONTRACT_ERROR_MESSAGES[CONTRACT_ERROR_CODES[code]],
      language,
    );
    return notFound
      ? new I18nNotFoundException({ en: message, ar: message }, language)
      : // 409, not 400: the global ValidationExceptionFilter turns REST 400s
        // into 500s (BACKLOG H-23).
        new I18nConflictException({ en: message, ar: message }, language);
  }
}
