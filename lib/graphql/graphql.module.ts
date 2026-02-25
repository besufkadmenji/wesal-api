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
        if (ctx.extra) {
          return { userId: ctx.extra.userId };
        }
        // HTTP request context
        return { req: ctx.req };
      },
    }),
  ],
})
export class GraphQLConfigModule {}
