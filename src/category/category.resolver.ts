import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';
import { CategoryPaginationInput } from './dto/category-pagination.input';
import { PaginatedCategoryResponse } from './dto/paginated-category.response';
import { GetLanguage } from '../../lib/i18n';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Mutation(() => Category)
  async createCategory(
    @Args('input') createCategoryInput: CreateCategoryInput,
    @GetLanguage() language: LanguageCode,
  ): Promise<Category> {
    return this.categoryService.create(createCategoryInput, language);
  }

  @Query(() => PaginatedCategoryResponse, { name: 'categories' })
  async findAll(
    @Args('input', { nullable: true }) input?: CategoryPaginationInput,
  ): Promise<IPaginatedType<Category>> {
    return this.categoryService.findAll(input ?? {});
  }

  @Query(() => Category, { name: 'category' })
  async findOne(
    @Args('id') id: string,
    @GetLanguage() language: LanguageCode,
  ): Promise<Category> {
    return this.categoryService.findOne(id, language);
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
