import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CategoryService } from './category.service';
import { CategoryPaginationInput } from './dto/category-pagination.input';
import { CreateCategoryInput } from './dto/create-category.input';
import { PaginatedCategoryResponse } from './dto/paginated-category.response';
import { UpdateCategoryInput } from './dto/update-category.input';
import { Category } from './entities/category.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Mutation(() => Category)
  async createCategory(
    @Args('input') createCategoryInput: CreateCategoryInput,
  ): Promise<Category> {
    return this.categoryService.create(createCategoryInput);
  }

  @Query(() => PaginatedCategoryResponse, { name: 'categories' })
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Args('input', { nullable: true }) input?: CategoryPaginationInput,
    @CurrentUser() user?: JwtPayload,
  ): Promise<IPaginatedType<Category>> {
    return this.categoryService.findAll(input ?? {}, user?.sub);
  }

  @Query(() => Category, { name: 'category' })
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
    @CurrentUser() user?: JwtPayload,
  ): Promise<Category> {
    return this.categoryService.findOne(id, language, user?.sub);
  }

  @Mutation(() => Category)
  async updateCategory(
    @Args('input') updateCategoryInput: UpdateCategoryInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Category> {
    return this.categoryService.update(updateCategoryInput, language);
  }

  @Mutation(() => Category)
  async removeCategory(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Category> {
    return this.categoryService.remove(id, language);
  }
}
