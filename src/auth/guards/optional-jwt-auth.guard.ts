import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return ctx.getContext().req;
  }

  handleRequest(err: any, user: any) {
    // Don't throw error if no user - just return undefined
    // This allows the request to proceed without authentication
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user || undefined;
  }
}
