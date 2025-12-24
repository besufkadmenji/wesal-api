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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: true,
    }),
    GraphQLConfigModule,
    UserModule,
    CountryModule,
    CityModule,
    CategoryModule,
    AdvertisementModule,
    ConversationModule,
    ContractModule,
    PaymentModule,
    FavoriteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
