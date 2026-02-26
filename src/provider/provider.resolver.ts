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
import { CurrentProvider } from 'src/auth/decorators/current-provider.decorator';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Provider } from '../provider/entities/provider.entity';
import { CreateProviderInput } from './dto/create-provider.input';
import { PaginatedProviderResponse } from './dto/paginated-provider.response';
import { ProviderPaginationInput } from './dto/provider-pagination.input';
import {
  AdminSignContractInput,
  SignContractInput,
} from './dto/sign-contract.input';
import { AdminTerminateContractInput } from './dto/terminate-contract.input';
import { UpdateProviderInput } from './dto/update-provider.input';
import { ProviderService } from './provider.service';
import { DeleteProviderInput } from './dto/delete-provider.input';

@Resolver(() => Provider)
export class ProviderResolver {
  constructor(
    private readonly providerService: ProviderService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => Provider, { description: 'Create a new provider' })
  createProvider(
    @Args('createProviderInput') createProviderInput: CreateProviderInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.create(createProviderInput, language);
  }

  @Query(() => PaginatedProviderResponse, {
    name: 'providers',
    description: 'Get all providers with pagination',
  })
  findAll(@Args('pagination') pagination: ProviderPaginationInput) {
    return this.providerService.findAll(pagination);
  }

  @Query(() => Provider, {
    name: 'provider',
    description: 'Get provider by ID',
  })
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.findOne(id, language);
  }

  @Query(() => Provider, {
    name: 'providerByEmail',
    description: 'Get provider by email',
  })
  findByEmail(
    @Args('email') email: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.findByEmail(email, language);
  }

  @Query(() => Provider, {
    name: 'providerByPhone',
    description: 'Get provider by phone',
  })
  findByPhone(
    @Args('phone') phone: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.findByPhone(phone, language);
  }

  @Query(() => Provider, {
    name: 'meProvider',
    description: 'Get current authenticated provider',
  })
  @UseGuards(JwtAuthGuard)
  async getCurrentProvider(
    @CurrentProvider() provider: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.findOne(provider.sub, language);
  }

  @Mutation(() => Provider, { description: 'Update provider' })
  @UseGuards(JwtAuthGuard)
  updateProvider(
    @Args('updateProviderInput') updateProviderInput: UpdateProviderInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.update(updateProviderInput, language);
  }

  @Mutation(() => Provider, { description: 'Activate provider by ID' })
  @UseGuards(JwtAuthGuard)
  activateProvider(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.activate(id, language);
  }

  @Mutation(() => Provider, { description: 'Deactivate provider' })
  @UseGuards(JwtAuthGuard)
  deactivateProvider(
    @Args('id', { type: () => ID }) id: string,
    @Args('reason', { nullable: true }) reason?: string,
    @GetLanguage() language?: LanguageCode,
  ) {
    return this.providerService.deactivate(id, reason, language);
  }

  @Mutation(() => Provider, {
    description: 'Reject a pending provider join request',
  })
  @UseGuards(JwtAuthGuard)
  rejectProviderJoinRequest(
    @Args('id', { type: () => ID }) id: string,
    @Args('reason') reason: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.rejectJoinRequest(id, reason, language);
  }


  @Mutation(() => Provider, { description: 'Sign contract as provider' })
  @UseGuards(JwtAuthGuard)
  signProviderContract(
    @Args('input') input: SignContractInput,
    @CurrentProvider() provider: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.signContract(provider.sub, input, language);
  }

  @Mutation(() => Provider, {
    description: 'Admin signs provider contract',
  })
  @UseGuards(JwtAuthGuard)
  adminSignProviderContract(
    @Args('input') input: AdminSignContractInput,
    @CurrentAdmin() admin: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.adminSignContract(admin.sub, input, language);
  }

  @Mutation(() => Provider, {
    description: 'Terminate provider contract',
  })
  @UseGuards(JwtAuthGuard)
  terminateProviderContract(
    @Args('terminationReason') terminationReason: string,
    @CurrentProvider() provider: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.terminateContract(
      provider.sub,
      terminationReason,
      language,
    );
  }

  @Mutation(() => Provider, {
    description: 'Admin terminates provider contract',
  })
  @UseGuards(JwtAuthGuard)
  adminTerminateProviderContract(
    @Args('input') input: AdminTerminateContractInput,
    @CurrentAdmin() admin: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.adminTerminateContract(
      admin.sub,
      input,
      language,
    );
  }

  @Mutation(() => Provider, { description: 'Remove provider' })
  @UseGuards(JwtAuthGuard)
  removeProvider(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DeleteProviderInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.remove(id, input.reason, language);
  }

  @Mutation(() => Boolean, { description: 'Delete provider avatar by ID' })
  removeProviderAvatar(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.removeAvatar(id, language);
  }

  @Subscription(() => Provider, {
    description:
      'Subscribe to real-time updates for the authenticated provider',
    filter: (
      payload: { providerUpdated: { id: string } },
      _variables: unknown,
      context: { userId: string },
    ) => payload.providerUpdated.id === context.userId,
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  providerUpdated(@Context() context: { userId: string }) {
    return this.pubSub.asyncIterableIterator('providerUpdated');
  }
}
