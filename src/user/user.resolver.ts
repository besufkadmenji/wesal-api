import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { UserPaginationInput } from './dto/user-pagination.input';
import { PaginatedUserResponse } from './dto/paginated-user.response';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => User, { description: 'Create a new user' })
  createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @GetLanguage() language: LanguageCode,
  ) {
    console.log('Language in resolver:', language);
    return this.userService.create(createUserInput, language);
  }

  @Query(() => PaginatedUserResponse, {
    name: 'users',
    description: 'Get all users with pagination',
  })
  findAll(
    @Args('pagination', { nullable: true }) pagination?: UserPaginationInput,
  ) {
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
    return this.userService.update(
      updateUserInput.id,
      updateUserInput,
      language,
    );
  }

  @Mutation(() => User, { description: 'Delete user by ID' })
  removeUser(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.userService.remove(id, language);
  }
}
