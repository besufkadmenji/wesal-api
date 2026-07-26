import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import { Repository } from 'typeorm';
import { FileUploadService } from '../../lib/file-upload';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Contract } from './entities/contract.entity';
import { ContractDocument } from './entities/contract-document.entity';

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
    return this.getOrCreate(contract);
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

  private async getOrCreate(contract: Contract): Promise<Buffer> {
    const existing =
      contract.document ??
      (await this.documentRepository.findOne({
        where: { contractId: contract.id },
      }));
    if (existing) return this.fileUploadService.getFile(existing.path);

    const buffer = await this.render(contract);
    const hash = createHash('sha256').update(buffer).digest('hex');
    const uploaded = await this.fileUploadService.saveFile(
      buffer,
      `contract-${contract.publicId ?? contract.id}-v${contract.version}.pdf`,
      `contracts/${contract.id}`,
    );
    await this.documentRepository.save(
      this.documentRepository.create({
        contractId: contract.id,
        version: contract.version,
        path: uploaded.path,
        sha256: hash,
      }),
    );
    return buffer;
  }

  private render(contract: Contract): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        size: 'A4',
        margin: 44,
        info: {
          Title: `Wesal Contract ${contract.publicId ?? contract.id}`,
        },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));

      const arabicFont = path.join(
        process.cwd(),
        'node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff',
      );
      document.registerFont('NotoArabic', arabicFont);
      document.font('Helvetica-Bold').fontSize(20).text('WESAL CONTRACT', {
        align: 'center',
      });
      document
        .font('NotoArabic')
        .fontSize(18)
        .text('عقد منصة وصال', { align: 'center' });
      document.moveDown();

      const englishRows: Array<[string, string]> = [
        ['Contract number', String(contract.publicId ?? contract.id)],
        ['Version', String(contract.version)],
        ['Status', contract.status],
        ['Customer', contract.client?.name ?? contract.clientId],
        [
          'Provider',
          contract.provider?.commercialName ??
            contract.provider?.name ??
            contract.providerId,
        ],
        ['Listing', contract.conversation?.listing?.name ?? contract.listingId],
        ['Agreed price', String(contract.agreedPrice)],
        ['VAT', `${contract.vatRate}% (${contract.vatAmount})`],
        [
          'Commission',
          `${contract.commissionPercent}% (${contract.commissionAmount})`,
        ],
        ['Total payable', String(contract.totalPayable)],
      ];
      document.font('Helvetica').fontSize(10);
      for (const [label, value] of englishRows) {
        document.font('Helvetica-Bold').text(`${label}: `, { continued: true });
        document.font('Helvetica').text(value);
      }

      const section = (english: string, arabic: string, body: string) => {
        if (!body) return;
        document.moveDown();
        document.font('Helvetica-Bold').fontSize(12).text(english);
        document.font('NotoArabic').fontSize(12).text(arabic, {
          align: 'right',
        });
        document.font('NotoArabic').fontSize(9).text(body, { align: 'right' });
      };
      section(
        'Binding contract terms',
        'نص العقد الملزم',
        contract.contractDocumentText,
      );
      section(
        'Customer undertaking',
        'تعهد طالب الخدمة',
        `${contract.undertakingTextEn}\n${contract.undertakingTextAr}`,
      );
      section(
        'Cancellation and refund policy',
        'سياسة الإلغاء والاسترداد',
        `${contract.refundPolicyEn}\n${contract.refundPolicyAr}`,
      );

      document.moveDown();
      document.font('Helvetica-Bold').fontSize(12).text('Signatures');
      for (const signature of contract.signatures ?? []) {
        document
          .font('Helvetica')
          .fontSize(9)
          .text(
            `${signature.signatureType} - ${signature.signerType} - ${signature.signedAt.toISOString()}`,
          );
        const encoded = signature.signatureData.match(
          /^data:image\/(?:png|jpe?g);base64,(.+)$/i,
        )?.[1];
        if (encoded) {
          try {
            document.image(Buffer.from(encoded, 'base64'), {
              fit: [180, 70],
            });
          } catch {
            document
              .font('Helvetica')
              .fontSize(8)
              .text('Signature image could not be rendered.');
          }
        }
      }
      document.end();
    });
  }
}
