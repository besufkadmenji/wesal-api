import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '../lib/app/app.controller';
import { AppService } from '../lib/app/app.service';
import { GraphQLConfigModule } from '../lib/graphql/graphql.module';
import { UserModule } from './user/user.module';
import { CountryModule } from './country/country.module';
import { CityModule } from './city/city.module';
import { CategoryModule } from './category/category.module';
import { AdvertisementModule } from './advertisement/advertisement.module';
import { ConversationModule } from './conversation/conversation.module';
import { ContractModule } from './contract/contract.module';
import { PaymentModule } from './payment/payment.module';
import { FavoriteModule } from './favorite/favorite.module';
import { RatingModule } from './rating/rating.module';
import { ComplaintModule } from './complaint/complaint.module';
import { NotificationModule } from './notification/notification.module';
import { AuthModule } from './auth/auth.module';

// Parse DATABASE_URL if available, otherwise use individual env variables
function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Parse PostgreSQL connection string: postgresql://user:password@host:port/database
    const url = new URL(databaseUrl);
    return {
      type: 'postgres' as const,
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
    };
  }

  // Fall back to individual environment variables
  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      ...getDatabaseConfig(),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: true,
    }),
    GraphQLConfigModule,
    AuthModule,
    UserModule,
    CountryModule,
    CityModule,
    CategoryModule,
    AdvertisementModule,
    ConversationModule,
    ContractModule,
    PaymentModule,
    FavoriteModule,
    RatingModule,
    ComplaintModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
