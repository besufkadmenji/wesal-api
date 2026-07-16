import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context).getContext<{
      principal?: JwtPayload;
    }>();
    if (
      !gqlContext.principal?.sub ||
      (gqlContext.principal.type !== 'user' &&
        gqlContext.principal.type !== 'provider')
    ) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
