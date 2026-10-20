import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AdminJwtPayload } from '../types/admin-jwt-payload.type';

/** Allows a GraphQL subscription only on a connection opened with an admin token. */
@Injectable()
export class WsAdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context).getContext<{
      admin?: AdminJwtPayload;
    }>();
    if (!gqlContext.admin?.sub) throw new UnauthorizedException();
    return true;
  }
}
