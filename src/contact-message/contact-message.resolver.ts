import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ContactMessageService } from './contact-message.service';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageInput } from './dto/create-contact-message.input';
import { UpdateContactMessageInput } from './dto/update-contact-message.input';
import { ContactMessagePaginationInput } from './dto/contact-message-pagination.input';
import { PaginatedContactMessageResponse } from './dto/paginated-contact-message.response';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ContactMessage)
export class ContactMessageResolver {
  constructor(private readonly contactMessageService: ContactMessageService) {}

  @Mutation(() => ContactMessage, {
    description: 'Create contact message (public)',
  })
  createContactMessage(
    @Args('createContactMessageInput')
    createContactMessageInput: CreateContactMessageInput,
  ) {
    return this.contactMessageService.create(createContactMessageInput);
  }

  @Query(() => PaginatedContactMessageResponse, {
    name: 'contactMessages',
    description: 'Get contact messages (admin only) with pagination',
  })
  @UseGuards(AdminAuthGuard)
  findAll(
    @CurrentAdmin() admin: JwtPayload,
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
  @UseGuards(AdminAuthGuard)
  findOne(
    @CurrentAdmin() admin: JwtPayload,
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
  @UseGuards(AdminAuthGuard)
  updateContactMessage(
    @CurrentAdmin() admin: JwtPayload,
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

  @Mutation(() => Boolean, {
    description: 'Delete contact message (admin only)',
  })
  @UseGuards(AdminAuthGuard)
  async removeContactMessage(
    @CurrentAdmin() admin: JwtPayload,
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
  @UseGuards(AdminAuthGuard)
  markAsRead(
    @CurrentAdmin() admin: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.contactMessageService.markAsRead(id);
  }
}
