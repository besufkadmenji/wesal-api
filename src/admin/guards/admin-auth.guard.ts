import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext): unknown {
    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest<unknown>();
    }
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req?: unknown }>().req;
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    const principal = user as { type?: string } | undefined;
    if (err instanceof Error) throw err;
    if (err || !principal || principal.type) throw new UnauthorizedException();
    return user;
  }
}
