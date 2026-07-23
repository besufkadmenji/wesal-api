import { Inject, UnauthorizedException, UseGuards } from '@nestjs/common';
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
import { I18nNotFoundException } from 'lib/errors/i18n.exceptions';
import { I18nService } from 'lib/i18n';
import { PUB_SUB } from 'lib/pubsub/pubsub.module';
import { CurrentProvider } from 'src/auth/decorators/current-provider.decorator';
import { CurrentPrincipal } from 'src/auth/decorators/current-principal.decorator';
import { GetLanguage } from '../../lib/i18n/get-language.decorator';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { RequirePermission } from '../admin/decorators/require-permission.decorator';
import { AdminPermissionGuard } from '../admin/guards/admin-permission.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Provider } from '../provider/entities/provider.entity';
import { CreateProviderInput } from './dto/create-provider.input';
import { DeleteProviderInput } from './dto/delete-provider.input';
import { PaginatedProviderResponse } from './dto/paginated-provider.response';
import { ProviderPaginationInput } from './dto/provider-pagination.input';
import { SignContractInput } from './dto/sign-contract.input';
import { AdminTerminateContractInput } from './dto/terminate-contract.input';
import { UpdateProviderInput } from './dto/update-provider.input';
import { ProviderStatus } from './enums/provider-status.enum';
import { PROVIDER_ERROR_CODES } from './errors/provider.error-codes';
import { PROVIDER_ERROR_MESSAGES } from './errors/provider.error-messages';
import { ProviderService } from './provider.service';

@Resolver(() => Provider)
export class ProviderResolver {
  constructor(
    private readonly providerService: ProviderService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => Provider, { description: 'Create a new provider' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'update')
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
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'read')
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
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'read')
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
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'read')
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
    const currentProvider = await this.providerService.findOne(
      provider.sub,
      language,
    );
    if (currentProvider.status !== ProviderStatus.ACTIVE) {
      const message = I18nService.translate(
        PROVIDER_ERROR_MESSAGES[PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }
    return currentProvider;
  }

  @Mutation(() => Provider, { description: 'Update provider' })
  @UseGuards(JwtAuthGuard)
  updateProvider(
    @Args('updateProviderInput') updateProviderInput: UpdateProviderInput,
    @CurrentProvider() provider: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ) {
    if (!provider) {
      throw new UnauthorizedException('Provider not authenticated');
    }
    return this.providerService.update(
      provider.sub,
      updateProviderInput,
      language,
    );
  }

  @Mutation(() => Provider, { description: 'Activate provider by ID' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'update')
  activateProvider(
    @Args('id', { type: () => ID }) id: string,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.activate(id, language);
  }

  @Mutation(() => Provider, { description: 'Deactivate provider' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'update')
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
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'update')
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
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'update')
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

  @Mutation(() => Provider, {
    description:
      'Admin reactivates a provider whose contract was terminated by admin',
  })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'update')
  adminReactivateProvider(
    @Args('providerId', { type: () => ID }) providerId: string,
    @CurrentAdmin() admin: JwtPayload,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.adminReactivateProvider(
      admin.sub,
      providerId,
      language,
    );
  }

  @Mutation(() => Provider, { description: 'Remove provider' })
  @UseGuards(JwtAuthGuard, AdminPermissionGuard)
  @RequirePermission('provider', 'delete')
  removeProvider(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DeleteProviderInput,
    @GetLanguage() language: LanguageCode,
  ) {
    return this.providerService.remove(id, input.reason, language);
  }

  @Mutation(() => Boolean, { description: 'Remove own provider avatar' })
  @UseGuards(JwtAuthGuard)
  removeProviderAvatar(
    @CurrentProvider() provider: JwtPayload | undefined,
    @GetLanguage() language: LanguageCode,
  ) {
    if (!provider) {
      throw new UnauthorizedException('Provider not authenticated');
    }
    return this.providerService.removeAvatar(provider.sub, language);
  }

  @Subscription(() => Provider, {
    description:
      'Subscribe to real-time updates for the authenticated provider',
    filter: (
      payload: { providerUpdated: { id: string } },
      _variables: unknown,
      context: { principal: JwtPayload },
    ) =>
      context.principal.type === 'provider' &&
      payload.providerUpdated.id === context.principal.sub,
  })
  @UseGuards(WsJwtAuthGuard)
  providerUpdated(
    @Context() _context: { principal: JwtPayload },
    @CurrentPrincipal() principal: JwtPayload,
  ) {
    if (principal.type !== 'provider') {
      throw new UnauthorizedException('Provider not authenticated');
    }
    return this.pubSub.asyncIterableIterator('providerUpdated');
  }
}
