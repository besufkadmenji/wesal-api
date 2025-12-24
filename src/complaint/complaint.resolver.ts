import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ComplaintService } from './complaint.service';
import { Complaint } from './entities/complaint.entity';
import { CreateComplaintInput } from './dto/create-complaint.input';
import { UpdateComplaintInput } from './dto/update-complaint.input';
import { ReviewComplaintInput } from './dto/review-complaint.input';
import { ComplaintPaginationInput } from './dto/complaint-pagination.input';
import { PaginatedComplaintResponse } from './dto/paginated-complaint.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Resolver(() => Complaint)
export class ComplaintResolver {
  constructor(private readonly complaintService: ComplaintService) {}

  @Mutation(() => Complaint)
  async createComplaint(
    @Args('input') createComplaintInput: CreateComplaintInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.create(createComplaintInput, language);
  }

  @Query(() => PaginatedComplaintResponse, { name: 'complaints' })
  async findAll(
    @Args('input', { nullable: true }) input?: ComplaintPaginationInput,
  ): Promise<IPaginatedType<Complaint>> {
    return this.complaintService.findAll(input ?? {});
  }

  @Query(() => Complaint, { name: 'complaint' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.findOne(id, language);
  }

  @Mutation(() => Complaint)
  async updateComplaint(
    @Args('input') updateComplaintInput: UpdateComplaintInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.update(updateComplaintInput, language);
  }

  @Mutation(() => Complaint)
  async removeComplaint(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.remove(id, language);
  }

  @Mutation(() => Complaint, {
    description: 'Review and resolve a complaint',
  })
  async reviewComplaint(
    @Args('input') reviewInput: ReviewComplaintInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.reviewComplaint(reviewInput, language);
  }

  @Mutation(() => Complaint, {
    description: 'Reject a complaint',
  })
  async rejectComplaint(
    @Args('complaintId') complaintId: string,
    @Args('reviewerId') reviewerId: string,
    @Args('reason') reason: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.rejectComplaint(
      complaintId,
      reviewerId,
      reason,
      language,
    );
  }
}
