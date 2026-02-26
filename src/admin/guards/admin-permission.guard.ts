import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    @InjectRepository(AdminPermission)
    private readonly adminPermissionRepository: Repository<AdminPermission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<
      PermissionRequirement | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    // No @RequirePermission decorator — allow through
    if (!requirement) {
      return true;
    }

    const gqlCtx = GqlExecutionContext.create(context);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const req = gqlCtx.getContext().req;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const admin = req?.user as AdminJwtPayload | undefined;

    if (!admin?.sub) {
      throw new UnauthorizedException('Not authenticated');
    }

    // SUPER_ADMIN and ADMINISTRATOR bypass granular checks
    if (BYPASS_ROLES.has(admin.permissionType)) {
      return true;
    }

    // For MODERATOR, VIEWER, CUSTOM — do a DB lookup
    const hasPermission = await this.adminPermissionRepository
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
