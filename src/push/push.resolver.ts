import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import type { AdminJwtPayload } from '../admin/types/admin-jwt-payload.type';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { RegisterPushDeviceInput } from './dto/register-push-device.input';
import { adminOwner, participantOwner, PushService } from './push.service';

@Resolver()
export class PushResolver {
  constructor(private readonly pushService: PushService) {}

  @Mutation(() => Boolean, {
    description: 'Registers this browser for FCM push notifications',
  })
  @UseGuards(JwtAuthGuard)
  registerPushDevice(
    @Args('input') input: RegisterPushDeviceInput,
    @CurrentPrincipal() principal: JwtPayload,
    @Context() context: { req?: { headers?: Record<string, unknown> } },
  ): Promise<boolean> {
    const userAgent = context.req?.headers?.['user-agent'];
    return this.pushService.register(
      input.token,
      input.language,
      typeof userAgent === 'string' ? userAgent : null,
      participantOwner(principal),
    );
  }

  @Mutation(() => Boolean, {
    description: 'Stops FCM push notifications to this browser',
  })
  @UseGuards(JwtAuthGuard)
  unregisterPushDevice(
    @Args('token') token: string,
    @CurrentPrincipal() principal: JwtPayload,
  ): Promise<boolean> {
    return this.pushService.unregister(token, participantOwner(principal));
  }

  @Mutation(() => Boolean, {
    description: 'Registers this admin browser for FCM push notifications',
  })
  @UseGuards(AdminAuthGuard)
  registerAdminPushDevice(
    @Args('input') input: RegisterPushDeviceInput,
    @CurrentAdmin() admin: AdminJwtPayload,
    @Context() context: { req?: { headers?: Record<string, unknown> } },
  ): Promise<boolean> {
    const userAgent = context.req?.headers?.['user-agent'];
    return this.pushService.register(
      input.token,
      input.language,
      typeof userAgent === 'string' ? userAgent : null,
      adminOwner(admin),
    );
  }

  @Mutation(() => Boolean, {
    description: 'Stops FCM push notifications to this admin browser',
  })
  @UseGuards(AdminAuthGuard)
  unregisterAdminPushDevice(
    @Args('token') token: string,
    @CurrentAdmin() admin: AdminJwtPayload,
  ): Promise<boolean> {
    return this.pushService.unregister(token, adminOwner(admin));
  }
}
