import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const gqlContext = GqlExecutionContext.create(ctx);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const request = gqlContext.getContext().req;
    // Optional authentication also uses Passport's `request.user` slot for
    // provider tokens. Do not treat those provider IDs as customer IDs.
    // Admin payloads intentionally have no participant type and remain
    // available to the existing admin-aware public queries.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request?.user as JwtPayload | undefined;
    return user?.type === 'provider' ? undefined : user;
  },
);
