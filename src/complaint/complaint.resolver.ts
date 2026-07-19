import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLUpload, type FileUpload } from 'graphql-upload-ts';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ComplaintService } from './complaint.service';
import { ComplaintPaginationInput } from './dto/complaint-pagination.input';
import { CreateComplaintInput } from './dto/create-complaint.input';
import { PaginatedComplaintResponse } from './dto/paginated-complaint.response';
import { ComplaintMessage } from './entities/complaint-message.entity';
import { Complaint } from './entities/complaint.entity';
import { ComplaintStatus } from './enums/complaint-status.enum';

@Resolver(() => Complaint)
export class ComplaintResolver {
  constructor(private readonly complaintService: ComplaintService) {}

  @Mutation(() => Complaint)
  @UseGuards(JwtAuthGuard)
  createComplaint(
    @Args('input') input: CreateComplaintInput,
    @Args('evidence', { type: () => [GraphQLUpload], nullable: true })
    evidence: Promise<FileUpload>[] | undefined,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.create(input, evidence, principal, language);
  }

  @Query(() => PaginatedComplaintResponse, { name: 'myComplaints' })
  @UseGuards(JwtAuthGuard)
  myComplaints(
    @CurrentPrincipal() principal: JwtPayload,
    @Args('input', { nullable: true }) input?: ComplaintPaginationInput,
  ) {
    return this.complaintService.findMine(input ?? {}, principal);
  }

  @Query(() => Complaint, { name: 'myComplaint' })
  @UseGuards(JwtAuthGuard)
  myComplaint(
    @Args('id') id: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.findOneForReporter(id, principal, language);
  }

  @Mutation(() => ComplaintMessage)
  @UseGuards(JwtAuthGuard)
  addComplaintMessage(
    @Args('complaintId') complaintId: string,
    @Args('content') content: string,
    @CurrentPrincipal() principal: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<ComplaintMessage> {
    return this.complaintService.addReporterMessage(
      complaintId,
      content,
      principal,
      language,
    );
  }

  @Query(() => PaginatedComplaintResponse, { name: 'adminComplaints' })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('complaint', 'read')
  adminComplaints(
    @Args('input', { nullable: true }) input?: ComplaintPaginationInput,
  ) {
    return this.complaintService.findAdmin(input ?? {});
  }

  @Query(() => Complaint, { name: 'adminComplaint' })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('complaint', 'read')
  adminComplaint(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.loadAdmin(id, language);
  }

  @Mutation(() => ComplaintMessage)
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('complaint', 'update')
  adminReplyToComplaint(
    @Args('complaintId') complaintId: string,
    @Args('content') content: string,
    @CurrentAdmin() admin: AdminJwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<ComplaintMessage> {
    return this.complaintService.addAdminMessage(
      complaintId,
      content,
      admin,
      language,
    );
  }

  @Mutation(() => Complaint)
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('complaint', 'update')
  adminSetComplaintStatus(
    @Args('complaintId') complaintId: string,
    @Args('status', { type: () => ComplaintStatus }) status: ComplaintStatus,
    @CurrentAdmin() admin: AdminJwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<Complaint> {
    return this.complaintService.setStatus(
      complaintId,
      status,
      admin,
      language,
    );
  }
}
