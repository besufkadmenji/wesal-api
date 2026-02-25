/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import * as jwt from 'jsonwebtoken';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      introspection: true,
      playground: false,
      subscriptions: {
        'graphql-ws': {
          onConnect: (ctx: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const auth = ctx.connectionParams?.Authorization as
              | string
              | undefined;
            if (!auth) {
              throw new Error('Unauthorized: missing token');
            }
            const token = auth.replace('Bearer ', '');
            try {
              const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'your-secret-key',
              ) as { sub: string };
              // Store userId in extra so the context factory can read it
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              ctx.extra.userId = decoded.sub;
            } catch {
              throw new Error('Unauthorized: invalid token');
            }
          },
        },
      },
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      context: (ctx: any) => {
        // WebSocket subscription context
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (ctx.extra) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          return { userId: ctx.extra.userId };
        }
        // HTTP request context
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return { req: ctx.req };
      },
    }),
  ],
})
export class GraphQLConfigModule {}
