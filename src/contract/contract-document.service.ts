import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { FileUploadService } from '../../lib/file-upload';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  formatPdfDate,
  formatPdfNumber,
  registerPdfFont,
  shapePdfText,
} from '../common/pdf/pdf-text';
import { CONTRACT_STATUS_LABELS } from './contract-status.labels';
import { visibleContractClient } from './contract-client-visibility';
import { ContractDocument } from './entities/contract-document.entity';
import { Contract } from './entities/contract.entity';
import { ContractSignatureType } from './enums/contract-signature-type.enum';
import { ContractStatus } from './enums/contract-status.enum';

const SIGNATURE_LABELS: Partial<Record<ContractSignatureType, string>> = {
  [ContractSignatureType.CUSTOMER_ACCEPTANCE]: 'Customer acceptance',
  [ContractSignatureType.PROVIDER_ACCEPTANCE]: 'Provider acceptance',
  [ContractSignatureType.PROVIDER_COMPLETION]: 'Provider completion',
  [ContractSignatureType.CUSTOMER_COMPLETION]: 'Customer completion',
};

@Injectable()
export class ContractDocumentService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(ContractDocument)
    private readonly documentRepository: Repository<ContractDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async forParticipant(
    contractId: string,
    principal: JwtPayload,
  ): Promise<Buffer> {
    const contract = await this.load(contractId);
    const participant =
      (principal.type === 'user' && contract.clientId === principal.sub) ||
      (principal.type === 'provider' && contract.providerId === principal.sub);
    if (!participant) throw new ForbiddenException();
    // The provider gets the customer's identity only after payment; a paid
    // (and so any completed, cacheable) contract is never masked.
    const client = visibleContractClient(contract, principal);
    return this.getOrCreate(
      client && client !== contract.client ? { ...contract, client } : contract,
    );
  }

  async forAdmin(contractId: string): Promise<Buffer> {
    return this.getOrCreate(await this.load(contractId));
  }

  private async load(contractId: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: [
        'conversation',
        'conversation.listing',
        'client',
        'provider',
        'signatures',
        'document',
      ],
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  /**
   * Only a completed contract's PDF is final, so only that one is cached.
   * Earlier requests render fresh and never leave a stale document behind.
   */
  private async getOrCreate(contract: Contract): Promise<Buffer> {
    const isFinal = contract.status === ContractStatus.COMPLETED;
    if (isFinal) {
      const existing =
        contract.document ??
        (await this.documentRepository.findOne({
          where: { contractId: contract.id },
        }));
      if (existing && existing.version === contract.version) {
        return this.fileUploadService.getFile(existing.path);
      }
    }

    const buffer = await this.render(contract);
    if (!isFinal) return buffer;
    const hash = createHash('sha256').update(buffer).digest('hex');
    const uploaded = await this.fileUploadService.saveFile(
      buffer,
      `contract-${contract.publicId ?? contract.id}-v${contract.version}.pdf`,
      `contracts/${contract.id}`,
    );
    await this.documentRepository.upsert(
      {
        contractId: contract.id,
        version: contract.version,
        path: uploaded.path,
        sha256: hash,
      },
      ['contractId'],
    );
    return buffer;
  }

  /**
   * Signatures are stored as file keys (the web loads them from /files/<key>);
   * older rows may hold data URIs. Unreadable images are skipped.
   */
  private async signatureImage(value: string): Promise<Buffer | null> {
    const encoded = value.match(
      /^data:image\/(?:png|jpe?g);base64,(.+)$/i,
    )?.[1];
    if (encoded) return Buffer.from(encoded, 'base64');
    try {
      return await this.fileUploadService.getFile(value);
    } catch {
      return null;
    }
  }

  private async render(contract: Contract): Promise<Buffer> {
    const signatures = await Promise.all(
      (contract.signatures ?? []).map(async (signature) => ({
        signature,
        image: await this.signatureImage(signature.signatureData),
      })),
    );
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: { Title: `Wesal Contract ${contract.publicId ?? contract.id}` },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));
      registerPdfFont(document);

      const margin = 40;
      const width = document.page.width - margin * 2;
      const bottom = document.page.height - 50;
      const ensureSpace = (height: number) => {
        if (document.y + height > bottom) document.addPage();
      };
      const money = (value: number) => formatPdfNumber(Number(value), 2);
      const date = (value: Date | null | undefined) =>
        value ? formatPdfDate(new Date(value), 'en') : '-';
      const phone = (dial?: string | null, number?: string | null) =>
        number
          ? `${dial && !number.startsWith('+') ? dial : ''}${number}`
          : '-';

      document
        .save()
        .rect(0, 0, document.page.width, 8)
        .fill('#2563EB')
        .restore();
      document
        .fillColor('#111827')
        .fontSize(18)
        .text('WESAL CONTRACT', margin, 28, { width, align: 'left' });
      document.fontSize(18).text(shapePdfText('عقد منصة وصال'), margin, 28, {
        width,
        align: 'right',
      });
      document.y = 64;

      // Bilingual rows: English label | value | Arabic label.
      const row = (en: string, ar: string, value: string) => {
        ensureSpace(22);
        const y = document.y;
        document.fillColor('#6B7280').fontSize(8);
        document.text(en, margin, y, { width: width * 0.28 });
        document.text(shapePdfText(ar), margin + width * 0.72, y, {
          width: width * 0.28,
          align: 'right',
        });
        document
          .fillColor('#111827')
          .fontSize(9)
          .text(shapePdfText(value), margin + width * 0.28, y, {
            width: width * 0.44,
            align: 'center',
          });
        document.y = Math.max(document.y, y + 16);
        document
          .moveTo(margin, document.y)
          .lineTo(margin + width, document.y)
          .lineWidth(0.4)
          .strokeColor('#E5E7EB')
          .stroke();
        document.y += 4;
      };
      const heading = (en: string, ar: string) => {
        // Keep a heading with at least its first lines.
        ensureSpace(80);
        document.moveDown(0.6);
        const y = document.y;
        document.fillColor('#1D4ED8').fontSize(11).text(en, margin, y, {
          width,
          align: 'left',
        });
        document.text(shapePdfText(ar), margin, y, { width, align: 'right' });
        document.y = y + 20;
      };

      const status = CONTRACT_STATUS_LABELS[contract.status];
      heading('Contract', 'التعاقد');
      row(
        'Contract number',
        'رقم التعاقد',
        String(contract.publicId ?? contract.id),
      );
      row('Status', 'الحالة', `${status?.en ?? contract.status}`);
      row('Listing', 'الإعلان', contract.conversation?.listing?.name ?? '-');
      row('Created', 'تاريخ الإنشاء', date(contract.createdAt));
      row('Accepted', 'تاريخ القبول', date(contract.acceptedAt));
      row('Paid', 'تاريخ السداد', date(contract.paidAt));
      row('Completed', 'تاريخ الإتمام', date(contract.completedAt));

      heading('Customer', 'العميل');
      row('Name', 'الاسم', contract.client?.name ?? '-');
      row(
        'Mobile',
        'الجوال',
        phone(contract.client?.dialCode, contract.client?.phone),
      );
      row('Address', 'العنوان', contract.customerAddress || '-');

      heading('Service provider', 'مقدم الخدمة');
      row(
        'Trade name',
        'الاسم التجاري',
        contract.provider?.commercialName ?? contract.provider?.name ?? '-',
      );
      row(
        'Mobile',
        'الجوال',
        phone(contract.provider?.dialCode, contract.provider?.phone),
      );
      row('Address', 'العنوان', contract.providerAddress || '-');

      heading('Financials', 'التفاصيل المالية');
      row(
        'Agreed price (SAR)',
        'السعر المتفق عليه (ر.س)',
        money(contract.agreedPrice),
      );
      row(
        'Deposit',
        'العربون',
        `${formatPdfNumber(Number(contract.depositPercent))}% - ${money(contract.downPayment)}`,
      );
      row(
        'Delivery company',
        'شركة التوصيل',
        contract.deliveryCompanyNameAr || contract.deliveryCompanyNameEn || '-',
      );
      row(
        'Commission',
        'العمولة',
        `${formatPdfNumber(Number(contract.commissionPercent))}% - ${money(contract.commissionAmount)}`,
      );
      row(
        'VAT',
        'ضريبة القيمة المضافة',
        `${formatPdfNumber(Number(contract.vatRate))}% - ${money(contract.vatAmount)}`,
      );
      row(
        'Total payable (SAR)',
        'الإجمالي (ر.س)',
        money(contract.totalPayable),
      );

      // Long Arabic text: one shaped run per line (pdfkit can't wrap a run).
      const paragraph = (text: string | null | undefined) => {
        if (!text?.trim()) return;
        document.fontSize(9).fillColor('#111827');
        for (const source of text.split('\n')) {
          const arabic = /[\u0600-\u06FF]/.test(source);
          if (!arabic) {
            ensureSpace(14);
            document.text(source, margin, document.y, { width, align: 'left' });
            continue;
          }
          let line = '';
          const flush = () => {
            if (!line) return;
            ensureSpace(14);
            const y = document.y;
            document.text(shapePdfText(line), margin, y, {
              width,
              align: 'right',
              lineBreak: false,
            });
            document.y = y + 14;
            line = '';
          };
          for (const word of source.split(/\s+/).filter(Boolean)) {
            const next = line ? `${line} ${word}` : word;
            if (document.widthOfString(shapePdfText(next)) > width) flush();
            line = line ? `${line} ${word}` : word;
          }
          flush();
        }
      };
      heading('Binding contract terms', 'نص العقد الملزم');
      paragraph(contract.contractDocumentText);
      heading('Customer undertaking', 'تعهد طالب الخدمة');
      paragraph(contract.undertakingTextAr);
      paragraph(contract.undertakingTextEn);
      heading('Cancellation and refund policy', 'سياسة الإلغاء والاسترداد');
      paragraph(contract.refundPolicyAr);
      paragraph(contract.refundPolicyEn);

      heading('Signatures', 'التوقيعات');
      for (const { signature, image } of signatures) {
        ensureSpace(100);
        document
          .fillColor('#6B7280')
          .fontSize(8)
          .text(
            `${SIGNATURE_LABELS[signature.signatureType] ?? signature.signatureType} - ${date(signature.signedAt)}`,
            margin,
            document.y,
            { width },
          );
        if (image) {
          try {
            document.image(image, margin, document.y + 2, { fit: [180, 70] });
            document.y += 76;
            continue;
          } catch {
            // fall through to the note below
          }
        }
        document
          .fillColor('#9CA3AF')
          .text('Signature image not available.', margin, document.y, {
            width,
          });
        document.y += 6;
      }
      document.end();
    });
  }
}
