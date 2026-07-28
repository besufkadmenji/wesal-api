import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../strategies/jwt.strategy';

export const CurrentProvider = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const gqlContext = GqlExecutionContext.create(ctx);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const request = gqlContext.getContext().req;
    // Passport assigns the authenticated payload to `request.user` after the
    // guard completes, even when it represents a provider. Prefer the
    // role-specific slot, but accept that canonical Passport slot as well.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const provider = (request?.provider ?? request?.user) as
      | JwtPayload
      | undefined;
    return provider?.type === 'provider' ? provider : undefined;
  },
);
