import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
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
  findAll(@CurrentAdmin() admin?: JwtPayload) {
    return this.faqService.findAll(admin?.sub ? true : false);
  }

  @Query(() => Faq, { name: 'faq' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.faqService.findOne(id);
  }

  @Mutation(() => Faq, { description: 'Create FAQ (admin only)' })
  @UseGuards(AdminAuthGuard)
  createFaq(
    @CurrentAdmin() admin: JwtPayload,
    @Args('createFaqInput') createFaqInput: CreateFaqInput,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.faqService.create(createFaqInput);
  }

  @Mutation(() => Faq, { description: 'Update FAQ (admin only)' })
  @UseGuards(AdminAuthGuard)
  updateFaq(
    @CurrentAdmin() admin: JwtPayload,
    @Args('updateFaqInput') updateFaqInput: UpdateFaqInput,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return this.faqService.update(updateFaqInput.id, updateFaqInput);
  }

  @Mutation(() => Boolean, { description: 'Remove FAQ (admin only)' })
  @UseGuards(AdminAuthGuard)
  async removeFaq(
    @CurrentAdmin() admin: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    await this.faqService.remove(id);
    return true;
  }

  @Mutation(() => [Faq], { description: 'Bulk update FAQ order (admin only)' })
  @UseGuards(AdminAuthGuard)
  async bulkUpdateOrder(
    @CurrentAdmin() admin: JwtPayload,
    @Args('input') input: BulkUpdateFaqOrderInput,
  ) {
    if (!admin?.sub) {
      throw new Error('Unauthorized');
    }
    return await this.faqService.bulkUpdateOrder(input);
  }
}
