import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../strategies/jwt.strategy';

export const CurrentProvider = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const gqlContext = GqlExecutionContext.create(ctx);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const request = gqlContext.getContext().req;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return request?.provider as JwtPayload | undefined;
  },
);
