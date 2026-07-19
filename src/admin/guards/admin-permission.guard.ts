import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { DataSource } from 'typeorm';
import { AdminPermission } from '../../admin-permission/entities/admin-permission.entity';
import { AdminPermissionType } from '../enums/admin-permission-type.enum';
import type { AdminJwtPayload } from '../types/admin-jwt-payload.type';
import {
  PERMISSION_KEY,
  type PermissionRequirement,
} from '../decorators/require-permission.decorator';
import { PermissionPlatform } from '../../permission/enums/permission-platform.enum';

/** Roles that bypass granular permission checks */
const BYPASS_ROLES = new Set<AdminPermissionType>([
  AdminPermissionType.SUPER_ADMIN,
  AdminPermissionType.ADMINISTRATOR,
]);

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<
      PermissionRequirement | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    // No @RequirePermission decorator — allow through
    if (!requirement) {
      return true;
    }

    const req =
      context.getType() === 'http'
        ? context.switchToHttp().getRequest<{ user?: AdminJwtPayload }>()
        : GqlExecutionContext.create(context).getContext<{
            req?: { user?: AdminJwtPayload };
          }>().req;
    const admin = req?.user;

    if (!admin?.sub) {
      throw new UnauthorizedException('Not authenticated');
    }

    // SUPER_ADMIN and ADMINISTRATOR bypass granular checks
    if (BYPASS_ROLES.has(admin.permissionType)) {
      return true;
    }

    // For MODERATOR, VIEWER, CUSTOM — do a DB lookup
    const hasPermission = await this.dataSource
      .getRepository(AdminPermission)
      .createQueryBuilder('ap')
      .innerJoin('ap.permission', 'p')
      .where('ap.adminId = :adminId', { adminId: admin.sub })
      .andWhere('p.module = :module', { module: requirement.module })
      .andWhere('(p.action = :action OR p.action = :fullAccess)', {
        action: requirement.action,
        fullAccess: 'full_access',
      })
      .andWhere('p.permissionPlatform = :platform', {
        platform: PermissionPlatform.ADMIN,
      })
      .getCount();

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to perform this action (${requirement.module}:${requirement.action})`,
      );
    }

    return true;
  }
}
