import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

export const CurrentAdmin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const gqlContext = GqlExecutionContext.create(ctx);
    const request = gqlContext.getContext().req;
    return request?.user as JwtPayload | undefined;
  },
);
