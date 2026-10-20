/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import * as jwt from 'jsonwebtoken';
import type { AdminJwtPayload } from '../../src/admin/types/admin-jwt-payload.type';
import type { JwtPayload } from '../../src/auth/strategies/jwt.strategy';

export interface SubscriptionAuth {
  principal?: JwtPayload;
  admin?: AdminJwtPayload;
}

/**
 * Authenticates a graphql-ws connection. A connection without a token is
 * anonymous and can only use public subscriptions (guarded subscriptions
 * reject it). A token, when sent, must be a valid customer, provider or
 * admin access token.
 */
export function verifySubscriptionConnection(
  connectionParams?: Record<string, unknown>,
): SubscriptionAuth {
  const authorization =
    connectionParams?.Authorization ?? connectionParams?.authorization;
  if (authorization === undefined || authorization === '') return {};
  if (
    typeof authorization !== 'string' ||
    !authorization.startsWith('Bearer ')
  ) {
    throw new Error('Unauthorized: invalid token');
  }

  try {
    const decoded = jwt.verify(
      authorization.slice('Bearer '.length),
      process.env.JWT_SECRET || 'your-secret-key',
    );
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      throw new Error('Invalid principal');
    }
    if (decoded.type === 'user' || decoded.type === 'provider') {
      return { principal: decoded as JwtPayload };
    }
    // Admin access tokens carry a permission type and no principal type.
    if (
      decoded.type === undefined &&
      typeof decoded.permissionType === 'string'
    ) {
      return { admin: decoded as AdminJwtPayload };
    }
    throw new Error('Invalid principal');
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
            ctx.extra.auth = verifySubscriptionConnection(
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
          const auth = (ctx.extra.auth ?? {}) as SubscriptionAuth;
          // The web sends its language as a connection param; expose it like
          // an HTTP header so @GetLanguage() works for subscription payloads.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const params = (ctx.connectionParams ?? {}) as Record<
            string,
            unknown
          >;
          const language = params['accept-language'];
          return {
            principal: auth.principal,
            admin: auth.admin,
            req: {
              headers: {
                'accept-language':
                  typeof language === 'string' ? language : undefined,
              },
            },
          };
        }
        // HTTP request context
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return { req: ctx.req };
      },
    }),
  ],
})
export class GraphQLConfigModule {}
