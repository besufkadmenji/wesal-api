/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from '../../src/auth/strategies/jwt.strategy';

export function verifySubscriptionPrincipal(
  connectionParams?: Record<string, unknown>,
): JwtPayload {
  const authorization =
    connectionParams?.Authorization ?? connectionParams?.authorization;
  if (
    typeof authorization !== 'string' ||
    !authorization.startsWith('Bearer ')
  ) {
    throw new Error('Unauthorized: missing token');
  }

  try {
    const decoded = jwt.verify(
      authorization.slice('Bearer '.length),
      process.env.JWT_SECRET || 'your-secret-key',
    );
    if (
      typeof decoded === 'string' ||
      typeof decoded.sub !== 'string' ||
      (decoded.type !== 'user' && decoded.type !== 'provider')
    ) {
      throw new Error('Invalid principal');
    }
    return decoded as JwtPayload;
  } catch {
    throw new Error('Unauthorized: invalid token');
  }
}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      introspection: true,
      buildSchemaOptions: {
        scalarsMap: [{ type: () => Object, scalar: GraphQLJSON }],
      },
      playground: false,
      subscriptions: {
        'graphql-ws': {
          onConnect: (ctx: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ctx.extra.principal = verifySubscriptionPrincipal(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              ctx.connectionParams as Record<string, unknown> | undefined,
            );
          },
        },
      },
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      context: (ctx: any) => {
        // WebSocket subscription context
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (ctx.extra) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          return { principal: ctx.extra.principal };
        }
        // HTTP request context
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return { req: ctx.req };
      },
    }),
  ],
})
export class GraphQLConfigModule {}
