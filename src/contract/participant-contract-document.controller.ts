import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ContractDocumentService } from './contract-document.service';
import { ContractInvoiceService } from './contract-invoice.service';

@Controller('contract-documents')
@UseGuards(JwtAuthGuard)
export class ParticipantContractDocumentController {
  constructor(
    private readonly documents: ContractDocumentService,
    private readonly invoices: ContractInvoiceService,
  ) {}

  /** S4-57: the customer's own tax invoice, once the contract is paid. */
  @Get(':id/invoice')
  async invoice(
    @Param('id') id: string,
    @Query('language') language: string | undefined,
    @Req()
    request: Request & {
      user?: JwtPayload;
      provider?: JwtPayload;
    },
    @Res() response: Response,
  ): Promise<void> {
    const principal = request.user ?? request.provider;
    if (!principal) throw new Error('Unauthorized');
    const { buffer, number } = await this.invoices.forCustomer(
      id,
      principal,
      language === 'en' ? 'en' : 'ar',
    );
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${number}.pdf"`,
      'Content-Length': buffer.length,
    });
    response.send(buffer);
  }

  @Get(':id')
  async download(
    @Param('id') id: string,
    @Req()
    request: Request & {
      user?: JwtPayload;
      provider?: JwtPayload;
    },
    @Res() response: Response,
  ): Promise<void> {
    const principal = request.user ?? request.provider;
    if (!principal) throw new Error('Unauthorized');
    const buffer = await this.documents.forParticipant(id, principal);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contract-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    response.send(buffer);
  }
}
