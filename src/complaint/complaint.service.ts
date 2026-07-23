import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FileUpload } from 'graphql-upload-ts';
import { Repository } from 'typeorm';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors';
import { FileUploadService } from '../../lib/file-upload';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { Contract } from '../contract/entities/contract.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ComplaintPaginationInput } from './dto/complaint-pagination.input';
import { CreateComplaintInput } from './dto/create-complaint.input';
import {
  Complaint,
  type ComplaintAttachment,
} from './entities/complaint.entity';
import { ComplaintMessage } from './entities/complaint-message.entity';
import { ComplaintMessageAuthorType } from './enums/complaint-message-author-type.enum';
import { ComplaintReporterType } from './enums/complaint-reporter-type.enum';
import { ComplaintStatus } from './enums/complaint-status.enum';

const CLOSED_STATUSES = new Set([
  ComplaintStatus.RESOLVED,
  ComplaintStatus.REJECTED,
  ComplaintStatus.CLOSED,
]);

@Injectable()
export class ComplaintService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
    @InjectRepository(ComplaintMessage)
    private readonly messageRepository: Repository<ComplaintMessage>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(
    input: CreateComplaintInput,
    uploads: Promise<FileUpload>[] | undefined,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Complaint> {
    this.assertParticipantType(principal, language);
    const conversation = await this.conversationRepository.findOne({
      where: { id: input.conversationId },
    });
    if (!conversation) throw this.notFound(language);
    this.assertParticipant(conversation, principal, language);
    if (input.contractId) {
      const contract = await this.contractRepository.findOne({
        where: { id: input.contractId },
      });
      if (!contract || contract.conversationId !== conversation.id) {
        throw new BadRequestException(
          'Contract does not belong to conversation',
        );
      }
    }
    const reporterType =
      principal.type === 'provider'
        ? ComplaintReporterType.PROVIDER
        : ComplaintReporterType.USER;
    const duplicate = await this.complaintRepository.findOne({
      where: {
        reporterId: principal.sub,
        reporterType,
        conversationId: conversation.id,
      },
    });
    if (duplicate) throw new BadRequestException('Complaint already submitted');
    if ((uploads?.length ?? 0) > 3) {
      throw new BadRequestException('A maximum of three images is allowed');
    }
    const attachments: ComplaintAttachment[] = [];
    for (const pending of uploads ?? []) {
      attachments.push(await this.storeEvidence(await pending, principal));
    }
    const saved = await this.complaintRepository.save(
      this.complaintRepository.create({
        reporterId: principal.sub,
        reporterType,
        listingId: conversation.listingId,
        conversationId: conversation.id,
        contractId: input.contractId ?? null,
        title: input.title.trim(),
        description: input.description.trim(),
        attachments,
        status: ComplaintStatus.PENDING,
        reviewedByAdminId: null,
        reviewedAt: null,
      }),
    );
    return this.load(saved.id, language);
  }

  findMine(
    input: ComplaintPaginationInput,
    principal: JwtPayload,
  ): Promise<IPaginatedType<Complaint>> {
    this.assertParticipantType(principal, 'en');
    return this.findAll(input, {
      reporterId: principal.sub,
      reporterType:
        principal.type === 'provider'
          ? ComplaintReporterType.PROVIDER
          : ComplaintReporterType.USER,
    });
  }

  findAdmin(
    input: ComplaintPaginationInput,
  ): Promise<IPaginatedType<Complaint>> {
    return this.findAll(input);
  }

  async findOneForReporter(
    id: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Complaint> {
    const complaint = await this.load(id, language);
    const type =
      principal.type === 'provider'
        ? ComplaintReporterType.PROVIDER
        : ComplaintReporterType.USER;
    if (
      complaint.reporterId !== principal.sub ||
      complaint.reporterType !== type
    ) {
      throw this.unauthorized(language);
    }
    return complaint;
  }

  loadAdmin(id: string, language: LanguageCode = 'en'): Promise<Complaint> {
    return this.load(id, language);
  }

  async addReporterMessage(
    id: string,
    content: string,
    principal: JwtPayload,
    language: LanguageCode = 'en',
  ): Promise<ComplaintMessage> {
    const complaint = await this.findOneForReporter(id, principal, language);
    if (CLOSED_STATUSES.has(complaint.status)) {
      throw new BadRequestException('Complaint thread is closed');
    }
    return this.saveMessage(
      complaint.id,
      principal.sub,
      ComplaintMessageAuthorType.REPORTER,
      content,
    );
  }

  async addAdminMessage(
    id: string,
    content: string,
    admin: AdminJwtPayload,
    language: LanguageCode = 'en',
  ): Promise<ComplaintMessage> {
    const complaint = await this.load(id, language);
    if (CLOSED_STATUSES.has(complaint.status)) {
      throw new BadRequestException('Complaint thread is closed');
    }
    complaint.status = ComplaintStatus.UNDER_REVIEW;
    complaint.reviewedByAdminId = admin.sub;
    complaint.reviewedAt = new Date();
    await this.complaintRepository.save(complaint);
    return this.saveMessage(
      complaint.id,
      admin.sub,
      ComplaintMessageAuthorType.ADMIN,
      content,
    );
  }

  async setStatus(
    id: string,
    status: ComplaintStatus,
    admin: AdminJwtPayload,
    language: LanguageCode = 'en',
  ): Promise<Complaint> {
    const complaint = await this.load(id, language);
    complaint.status = status;
    complaint.reviewedByAdminId = admin.sub;
    complaint.reviewedAt = new Date();
    return this.complaintRepository.save(complaint);
  }

  private async findAll(
    input: ComplaintPaginationInput,
    scope?: { reporterId: string; reporterType: ComplaintReporterType },
  ): Promise<IPaginatedType<Complaint>> {
    const {
      page = 1,
      limit = 10,
      status,
      conversationId,
      search,
      sortBy,
      sortOrder = SortOrder.DESC,
    } = input;
    const query = this.complaintRepository
      .createQueryBuilder('complaint')
      .leftJoinAndSelect('complaint.listing', 'listing')
      .leftJoinAndSelect('complaint.conversation', 'conversation')
      .leftJoinAndSelect('complaint.messages', 'messages')
      .leftJoinAndSelect('complaint.reviewer', 'reviewer');
    if (scope) {
      query.andWhere('complaint.reporterId = :reporterId', scope);
      query.andWhere('complaint.reporterType = :reporterType', scope);
    }
    if (status) query.andWhere('complaint.status = :status', { status });
    if (conversationId) {
      query.andWhere('complaint.conversationId = :conversationId', {
        conversationId,
      });
    }
    if (search?.trim()) {
      query.andWhere(
        '(complaint.title ILIKE :search OR complaint.description ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }
    const [items, total] = await query
      .orderBy(
        `complaint.${sortBy ?? 'createdAt'}`,
        sortOrder === SortOrder.ASC ? 'ASC' : 'DESC',
      )
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const totalPages = Math.ceil(total / limit);
    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  private async load(id: string, language: LanguageCode): Promise<Complaint> {
    const complaint = await this.complaintRepository.findOne({
      where: { id },
      relations: [
        'listing',
        'conversation',
        'contract',
        'messages',
        'reviewer',
      ],
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!complaint) throw this.notFound(language);
    return complaint;
  }

  private saveMessage(
    complaintId: string,
    authorId: string,
    authorType: ComplaintMessageAuthorType,
    content: string,
  ): Promise<ComplaintMessage> {
    const value = content.trim();
    if (!value) throw new BadRequestException('Message cannot be empty');
    return this.messageRepository.save(
      this.messageRepository.create({
        complaintId,
        authorId,
        authorType,
        content: value,
      }),
    );
  }

  private async storeEvidence(
    upload: FileUpload,
    principal: JwtPayload,
  ): Promise<ComplaintAttachment> {
    if (upload.mimetype !== 'image/jpeg' && upload.mimetype !== 'image/png') {
      throw new BadRequestException('Evidence must be a PNG or JPEG image');
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of upload.createReadStream()) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as Uint8Array);
      size += buffer.length;
      if (size > 5 * 1024 * 1024) {
        throw new BadRequestException('Evidence image exceeds 5 MB');
      }
      chunks.push(buffer);
    }
    const buffer = Buffer.concat(chunks);
    const validMagic =
      upload.mimetype === 'image/png'
        ? buffer
            .subarray(0, 8)
            .equals(
              Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            )
        : buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!validMagic) throw new BadRequestException('Invalid image contents');
    const result = await this.fileUploadService.saveFile(
      buffer,
      upload.filename,
      `complaints/${principal.type}/${principal.sub}`,
    );
    return {
      ...result,
      mimeType: upload.mimetype,
      url: `/files/${result.path}`,
    };
  }

  private assertParticipantType(
    principal: JwtPayload,
    language: LanguageCode,
  ): void {
    if (principal.type !== 'user' && principal.type !== 'provider') {
      throw this.unauthorized(language);
    }
  }

  private assertParticipant(
    conversation: Conversation,
    principal: JwtPayload,
    language: LanguageCode,
  ): void {
    const allowed =
      (principal.type === 'user' && conversation.userId === principal.sub) ||
      (principal.type === 'provider' &&
        conversation.providerId === principal.sub);
    if (!allowed) throw this.unauthorized(language);
  }

  private notFound(language: LanguageCode): I18nNotFoundException {
    return new I18nNotFoundException(
      { en: 'Complaint not found', ar: 'الشكوى غير موجودة' },
      language,
    );
  }

  private unauthorized(language: LanguageCode): I18nBadRequestException {
    return new I18nBadRequestException(
      {
        en: 'Unauthorized complaint access',
        ar: 'لا تملك صلاحية الوصول للشكوى',
      },
      language,
    );
  }
}
