import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { UpdateUserInput } from './dto/update-user.input';
import { DeactivateUserInput } from './dto/deactivate-user.input';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { UserPaginationInput } from './dto/user-pagination.input';
import { PaginatedUserResponse } from './dto/paginated-user.response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User, {
    name: 'me',
    description: 'Get current authenticated user',
  })
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(
    @CurrentUser() user: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.findOne(user.sub, language);
  }

  @Query(() => PaginatedUserResponse, {
    name: 'users',
    description: 'Get all users with pagination by role',
  })
  findAll(@Args('pagination') pagination: UserPaginationInput) {
    return this.userService.findAll(pagination);
  }

  @Query(() => User, { name: 'user', description: 'Get user by ID' })
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.findOne(id, language);
  }

  @Mutation(() => User, { description: 'Update user' })
  updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @GetLanguage() language: LanguageCode,
  ) {
    console.log('language', language);
    return this.userService.update(
      updateUserInput.id,
      updateUserInput,
      language,
    );
  }

  @Mutation(() => Boolean, { description: 'Delete user avatar by ID' })
  removeAvatar(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.removeAvatar(id, language);
  }

  @Mutation(() => User, { description: 'Delete user by ID' })
  removeUser(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.remove(id, language);
  }

  @Mutation(() => User, { description: 'Activate user by ID' })
  @UseGuards(JwtAuthGuard)
  activateUser(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.activate(id, language);
  }

  @Mutation(() => User, { description: 'Deactivate user by ID' })
  @UseGuards(JwtAuthGuard)
  deactivateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DeactivateUserInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.deactivate(id, input.reason, language);
  }
}
