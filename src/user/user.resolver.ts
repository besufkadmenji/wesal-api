import { Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from 'lib/pubsub/pubsub.module';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { DeactivateUserInput } from './dto/deactivate-user.input';
import { DeleteUserInput } from './dto/delete-user.input';
import { PaginatedUserResponse } from './dto/paginated-user.response';
import { UpdateMeInput } from './dto/update-me.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserPaginationInput } from './dto/user-pagination.input';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { I18nNotFoundException } from 'lib/errors';
import { I18nService } from 'lib/i18n';
import { UserStatus } from './enums/user-status.enum';
import { USER_ERROR_CODES } from './errors/user.error-codes';
import { USER_ERROR_MESSAGES } from './errors/user.error-messages';

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => User, {
    name: 'meUser',
    description: 'Get current authenticated user',
    nullable: true,
  })
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(
    @CurrentUser() user: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ): Promise<User | null> {
    if (!user) return null;
    const currentUser = await this.userService.findOne(user.sub, language);
    if (currentUser.status !== UserStatus.ACTIVE) {
      const message = I18nService.translate(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }
    return currentUser;
  }

  @Mutation(() => User, { description: 'Update own profile (self-service)' })
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Args('updateMeInput') updateMeInput: UpdateMeInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.update(
      user.sub,
      { ...updateMeInput, id: user.sub },
      language,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Remove own avatar (self-service)',
  })
  @UseGuards(JwtAuthGuard)
  removeMyAvatar(
    @CurrentUser() user: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.removeAvatar(user.sub, language);
  }

  @Query(() => PaginatedUserResponse, {
    name: 'users',
    description: 'Get all users with pagination by role',
  })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('user', 'read')
  findAll(@Args('pagination') pagination: UserPaginationInput) {
    return this.userService.findAll(pagination);
  }

  @Query(() => User, { name: 'user', description: 'Get user by ID' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('user', 'read')
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.findOne(id, language);
  }

  @Mutation(() => User, { description: 'Update user' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('user', 'update')
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
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('user', 'update')
  removeAvatar(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.removeAvatar(id, language);
  }

  @Mutation(() => User, { description: 'Delete user by ID' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('user', 'delete')
  removeUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DeleteUserInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.remove(id, input.reason, language);
  }

  @Mutation(() => User, { description: 'Activate user by ID' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('user', 'update')
  activateUser(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.activate(id, language);
  }

  @Mutation(() => User, { description: 'Deactivate user by ID' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('user', 'update')
  deactivateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DeactivateUserInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.deactivate(id, input.reason, language);
  }

  @Subscription(() => User, {
    description: 'Subscribe to real-time updates for the authenticated user',
    filter: (
      payload: { userUpdated: { id: string } },
      _variables: unknown,
      context: { userId: string },
    ) => payload.userUpdated.id === context.userId,
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userUpdated(@Context() context: { userId: string }) {
    return this.pubSub.asyncIterableIterator('userUpdated');
  }
}
