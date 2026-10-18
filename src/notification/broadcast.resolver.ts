import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GetLanguage } from '../../lib/i18n';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { BroadcastService } from './broadcast.service';
import { BroadcastPaginationInput } from './dto/broadcast-pagination.input';
import { BroadcastRecipientOption } from './dto/broadcast-recipient-option.response';
import { PaginatedBroadcastResponse } from './dto/paginated-broadcast.response';
import { SendBroadcastInput } from './dto/send-broadcast.input';
import { NotificationBroadcast } from './entities/notification-broadcast.entity';
import { BroadcastRecipientType } from './enums/broadcast.enum';

/** Admin notification management (BRD 4.3.24). */
@Resolver(() => NotificationBroadcast)
@UseGuards(AdminAuthGuard, AdminPermissionGuard)
export class BroadcastResolver {
  constructor(private readonly broadcastService: BroadcastService) {}

  @Mutation(() => NotificationBroadcast, {
    description: 'Send a notification to active customers and/or providers',
  })
  @RequirePermission('notification', 'create')
  sendBroadcast(
    @Args('input') input: SendBroadcastInput,
    @CurrentAdmin() admin: AdminJwtPayload,
    @GetLanguage() language: LanguageCode,
  ): Promise<NotificationBroadcast> {
    return this.broadcastService.send(input, admin, language);
  }

  @Query(() => PaginatedBroadcastResponse)
  @RequirePermission('notification', 'read')
  adminBroadcasts(
    @Args('input', { nullable: true }) input?: BroadcastPaginationInput,
  ): Promise<IPaginatedType<NotificationBroadcast>> {
    return this.broadcastService.findAll(input ?? {});
  }

  @Query(() => NotificationBroadcast)
  @RequirePermission('notification', 'read')
  adminBroadcast(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<NotificationBroadcast> {
    return this.broadcastService.findOne(id, language);
  }

  @Query(() => [BroadcastRecipientOption], {
    description: 'Active accounts for the broadcast recipient picker (max 20)',
  })
  @RequirePermission('notification', 'create')
  broadcastRecipientOptions(
    @Args('type', { type: () => BroadcastRecipientType })
    type: BroadcastRecipientType,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<BroadcastRecipientOption[]> {
    return this.broadcastService.recipientOptions(type, search);
  }
}
