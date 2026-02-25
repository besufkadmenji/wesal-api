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
import { DeactivateUserInput } from './dto/deactivate-user.input';
import { DeleteUserInput } from './dto/delete-user.input';
import { PaginatedUserResponse } from './dto/paginated-user.response';
import { UpdateUserInput } from './dto/update-user.input';
import { UserPaginationInput } from './dto/user-pagination.input';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => User, {
    name: 'meUser',
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
    @Args('input') input: DeleteUserInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.remove(id, input.reason, language);
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
