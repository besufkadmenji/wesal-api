import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ContactMessageService } from './contact-message.service';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageInput } from './dto/create-contact-message.input';
import { UpdateContactMessageInput } from './dto/update-contact-message.input';
import { ContactMessagePaginationInput } from './dto/contact-message-pagination.input';
import { PaginatedContactMessageResponse } from './dto/paginated-contact-message.response';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';

@Resolver(() => ContactMessage)
export class ContactMessageResolver {
  constructor(private readonly contactMessageService: ContactMessageService) {}

  @Mutation(() => ContactMessage, {
    description: 'Create contact message (public)',
  })
  @UseGuards(OptionalJwtAuthGuard)
  createContactMessage(
    @Args('createContactMessageInput')
    createContactMessageInput: CreateContactMessageInput,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.contactMessageService.create(createContactMessageInput, user);
  }

  @Query(() => PaginatedContactMessageResponse, {
    name: 'contactMessages',
    description: 'Get contact messages (admin only) with pagination',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('contact_message', 'read')
  findAll(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('paginationInput', { nullable: true })
    paginationInput: ContactMessagePaginationInput,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.contactMessageService.findAll(paginationInput);
  }

  @Query(() => ContactMessage, {
    name: 'contactMessage',
    description: 'Get single contact message (admin only)',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('contact_message', 'read')
  findOne(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.contactMessageService.findOne(id);
  }

  @Mutation(() => ContactMessage, {
    description: 'Update contact message (admin only)',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('contact_message', 'read')
  updateContactMessage(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('updateContactMessageInput')
    updateContactMessageInput: UpdateContactMessageInput,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.contactMessageService.update(
      updateContactMessageInput.id,
      updateContactMessageInput,
    );
  }

  @Mutation(() => ContactMessage, {
    description: 'Reply to contact message (admin only)',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('contact_message', 'read')
  replyToContactMessage(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('message')
    message: string,
    @GetLanguage() language: LanguageCode,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.contactMessageService.reply(id, message, language);
  }

  @Mutation(() => Boolean, {
    description: 'Delete contact message (admin only)',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('contact_message', 'delete')
  async removeContactMessage(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    await this.contactMessageService.remove(id);
    return true;
  }

  @Mutation(() => ContactMessage, {
    description: 'Mark message as read (admin only)',
  })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('contact_message', 'read')
  markAsRead(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.contactMessageService.markAsRead(id);
  }
}
