import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { CategoryService } from './category.service';
import { CategoryPaginationInput } from './dto/category-pagination.input';
import { CreateCategoryInput } from './dto/create-category.input';
import { PaginatedCategoryResponse } from './dto/paginated-category.response';
import { UpdateCategoryInput } from './dto/update-category.input';
import { Category } from './entities/category.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Mutation(() => Category)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('category', 'create')
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
    const isAdmin = !!user && !user.type;
    return this.categoryService.findAll(input ?? {}, user?.sub, isAdmin);
  }

  @Query(() => Category, { name: 'category' })
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
    @CurrentUser() user?: JwtPayload,
  ): Promise<Category> {
    const isAdmin = !!user && !user.type;
    return this.categoryService.findOne(id, language, user?.sub, isAdmin);
  }

  @Mutation(() => Category)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('category', 'update')
  async updateCategory(
    @Args('input') updateCategoryInput: UpdateCategoryInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Category> {
    return this.categoryService.update(updateCategoryInput, language);
  }

  @Mutation(() => Category)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('category', 'delete')
  async removeCategory(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Category> {
    return this.categoryService.remove(id, language);
  }

  @Mutation(() => Category)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('category', 'update')
  async activateCategory(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Category> {
    return this.categoryService.activate(id, language);
  }

  @Mutation(() => Category)
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('category', 'update')
  async deactivateCategory(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Category> {
    return this.categoryService.deactivate(id, language);
  }
}
