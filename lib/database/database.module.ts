import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [`${__dirname}/../../src/**/*.entity.ts`],
        migrations: [`${__dirname}/../../src/migrations/*.ts`],
        synchronize: true,
        logging: true,
        // Enable enum support for PostgreSQL
        supportBigNumbers: true,
        bigNumberStrings: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
