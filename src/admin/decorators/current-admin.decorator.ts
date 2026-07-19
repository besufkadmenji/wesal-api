import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AdminJwtPayload } from '../types/admin-jwt-payload.type';

export const CurrentAdmin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AdminJwtPayload | undefined => {
    const gqlContext = GqlExecutionContext.create(ctx);
    const request = gqlContext.getContext<{
      req?: { user?: AdminJwtPayload };
    }>().req;
    return request?.user;
  },
);
