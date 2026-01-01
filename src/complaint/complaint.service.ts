import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  I18nNotFoundException,
  I18nBadRequestException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreateComplaintInput } from './dto/create-complaint.input';
import { UpdateComplaintInput } from './dto/update-complaint.input';
import { ReviewComplaintInput } from './dto/review-complaint.input';
import { ComplaintPaginationInput } from './dto/complaint-pagination.input';
import { Complaint } from './entities/complaint.entity';
import { User } from '../user/entities/user.entity';
import { Advertisement } from '../advertisement/entities/advertisement.entity';
import { ComplaintStatus } from './enums/complaint-status.enum';
import { COMPLAINT_ERROR_MESSAGES } from './errors/complaint.error-messages';

@Injectable()
export class ComplaintService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Advertisement)
    private readonly advertisementRepository: Repository<Advertisement>,
  ) {}

  async create(
    createComplaintInput: CreateComplaintInput,
    language: LanguageCode = 'en',
  ): Promise<Complaint> {
    // Validate description
    if (!createComplaintInput.description.trim()) {
      const message = I18nService.translate(
        COMPLAINT_ERROR_MESSAGES['EMPTY_DESCRIPTION'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: createComplaintInput.userId },
    });
    if (!user) {
      const message = I18nService.translate(
        COMPLAINT_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate advertisement exists
    const advertisement = await this.advertisementRepository.findOne({
      where: { id: createComplaintInput.advertisementId },
    });
    if (!advertisement) {
      const message = I18nService.translate(
        COMPLAINT_ERROR_MESSAGES['ADVERTISEMENT_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    const complaint = this.complaintRepository.create(createComplaintInput);
    return await this.complaintRepository.save(complaint);
  }

  async findAll(
    paginationInput: ComplaintPaginationInput,
  ): Promise<IPaginatedType<Complaint>> {
    const {
      page = 1,
      limit = 10,
      userId,
      advertisementId,
      status,
      reason,
      reviewedBy,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.complaintRepository
      .createQueryBuilder('complaint')
      .leftJoinAndSelect('complaint.user', 'user')
      .leftJoinAndSelect('complaint.advertisement', 'advertisement')
      .leftJoinAndSelect('complaint.reviewer', 'reviewer');

    if (userId) {
      queryBuilder.andWhere('complaint.userId = :userId', { userId });
    }

    if (advertisementId) {
      queryBuilder.andWhere('complaint.advertisementId = :advertisementId', {
        advertisementId,
      });
    }

    if (status) {
      queryBuilder.andWhere('complaint.status = :status', { status });
    }

    if (reason) {
      queryBuilder.andWhere('complaint.reason = :reason', { reason });
    }

    if (reviewedBy) {
      queryBuilder.andWhere('complaint.reviewedBy = :reviewedBy', {
        reviewedBy,
      });
    }

    const orderByField = sortBy ? `complaint.${sortBy}` : 'complaint.createdAt';
    const orderDirection = sortOrder === SortOrder.DESC ? 'DESC' : 'ASC';

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(orderByField, orderDirection)
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Complaint> {
    const complaint = await this.complaintRepository.findOne({
      where: { id },
      relations: ['user', 'advertisement', 'reviewer'],
    });

    if (!complaint) {
      const message = I18nService.translate(
        COMPLAINT_ERROR_MESSAGES['COMPLAINT_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return complaint;
  }

  async update(
    updateComplaintInput: UpdateComplaintInput,
    language: LanguageCode = 'en',
  ): Promise<Complaint> {
    const complaint = await this.findOne(updateComplaintInput.id, language);

    // Validate description if being updated
    if (
      updateComplaintInput.description !== undefined &&
      !updateComplaintInput.description.trim()
    ) {
      const message = I18nService.translate(
        COMPLAINT_ERROR_MESSAGES['EMPTY_DESCRIPTION'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    Object.assign(complaint, updateComplaintInput);
    return await this.complaintRepository.save(complaint);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Complaint> {
    const complaint = await this.findOne(id, language);
    await this.complaintRepository.remove(complaint);
    return complaint;
  }

  async reviewComplaint(
    reviewInput: ReviewComplaintInput,
    language: LanguageCode = 'en',
  ): Promise<Complaint> {
    const complaint = await this.findOne(reviewInput.complaintId, language);

    // Validate reviewer exists
    const reviewer = await this.userRepository.findOne({
      where: { id: reviewInput.reviewerId },
    });
    if (!reviewer) {
      const message = I18nService.translate(
        COMPLAINT_ERROR_MESSAGES['REVIEWER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    complaint.status = ComplaintStatus.RESOLVED;
    complaint.adminResponse = reviewInput.adminResponse;
    complaint.reviewedBy = reviewInput.reviewerId;
    complaint.reviewedAt = new Date();

    return await this.complaintRepository.save(complaint);
  }

  async rejectComplaint(
    complaintId: string,
    reviewerId: string,
    reason: string,
    language: LanguageCode = 'en',
  ): Promise<Complaint> {
    const complaint = await this.findOne(complaintId, language);

    // Validate reviewer exists
    const reviewer = await this.userRepository.findOne({
      where: { id: reviewerId },
    });
    if (!reviewer) {
      const message = I18nService.translate(
        COMPLAINT_ERROR_MESSAGES['REVIEWER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    complaint.status = ComplaintStatus.REJECTED;
    complaint.adminResponse = reason;
    complaint.reviewedBy = reviewerId;
    complaint.reviewedAt = new Date();

    return await this.complaintRepository.save(complaint);
  }
}
