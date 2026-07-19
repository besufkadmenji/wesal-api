import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext): unknown {
    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest<unknown>();
    }
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req?: unknown }>().req;
  }

  handleRequest<TUser extends { type?: string }>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err instanceof Error) throw err;
    if (err || !user) throw new UnauthorizedException();

    // Set user or provider on request based on token type
    const request: { user?: TUser; provider?: TUser } =
      context.getType() === 'http'
        ? context
            .switchToHttp()
            .getRequest<{ user?: TUser; provider?: TUser }>()
        : GqlExecutionContext.create(context).getContext<{
            req: { user?: TUser; provider?: TUser };
          }>().req;

    if (user.type === 'provider') {
      request.provider = user;
    } else {
      request.user = user;
    }

    return user;
  }
}
