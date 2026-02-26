import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { CreateFaqInput } from './dto/create-faq.input';
import { UpdateFaqInput } from './dto/update-faq.input';
import { BulkUpdateFaqOrderInput } from './dto/bulk-update-faq-order.input';
import { Faq } from './entities/faq.entity';
import { FaqService } from './faq.service';

@Resolver(() => Faq)
export class FaqResolver {
  constructor(private readonly faqService: FaqService) {}

  @Query(() => [Faq], {
    name: 'faqs',
    description: 'Get all active FAQs (or all if admin)',
  })
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@CurrentAdmin() admin?: AdminJwtPayload) {
    return this.faqService.findAll(!!admin?.sub);
  }

  @Query(() => Faq, { name: 'faq' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.faqService.findOne(id);
  }

  @Mutation(() => Faq, { description: 'Create FAQ (admin only)' })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('faq', 'create')
  createFaq(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('createFaqInput') createFaqInput: CreateFaqInput,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.faqService.create(createFaqInput);
  }

  @Mutation(() => Faq, { description: 'Update FAQ (admin only)' })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('faq', 'update')
  updateFaq(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('updateFaqInput') updateFaqInput: UpdateFaqInput,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.faqService.update(updateFaqInput.id, updateFaqInput);
  }

  @Mutation(() => Boolean, { description: 'Remove FAQ (admin only)' })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('faq', 'delete')
  async removeFaq(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    await this.faqService.remove(id);
    return true;
  }

  @Mutation(() => [Faq], { description: 'Bulk update FAQ order (admin only)' })
  @UseGuards(AdminAuthGuard, AdminPermissionGuard)
  @RequirePermission('faq', 'update')
  async bulkUpdateOrder(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Args('input') input: BulkUpdateFaqOrderInput,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return await this.faqService.bulkUpdateOrder(input);
  }
}
