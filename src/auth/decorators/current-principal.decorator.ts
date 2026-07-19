import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../strategies/jwt.strategy';

/**
 * Returns the authenticated principal regardless of whether the token is a
 * user or a provider. `JwtAuthGuard` places the payload on `req.user` (type
 * 'user') or `req.provider` (type 'provider'); this returns whichever is set.
 * The payload's `sub` is the acting id and `type` distinguishes User vs Provider.
 */
export const CurrentPrincipal = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const gqlContext = GqlExecutionContext.create(ctx);
    const context = gqlContext.getContext<{
      req?: { user?: JwtPayload; provider?: JwtPayload };
      principal?: JwtPayload;
    }>();
    const request = context.req;
    return request?.user ?? request?.provider ?? context.principal;
  },
);
