import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { lexicographicSortSchema, printSchema } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AdminPermissionResolver } from '../src/admin-permission/admin-permission.resolver';
import { AdminAuthResolver } from '../src/admin/auth/admin-auth.resolver';
import { AdminResolver } from '../src/admin/admin.resolver';
import { AuthResolver } from '../src/auth/auth.resolver';
import { ProviderAuthResolver } from '../src/auth/provider-auth.resolver';
import { BankResolver } from '../src/bank/bank.resolver';
import { CategoryResolver } from '../src/category/category.resolver';
import { CityResolver } from '../src/city/city.resolver';
import { ComplaintResolver } from '../src/complaint/complaint.resolver';
import { ContactMessageResolver } from '../src/contact-message/contact-message.resolver';
import { ContractResolver } from '../src/contract/contract.resolver';
import { ConversationResolver } from '../src/conversation/conversation.resolver';
import { MessageResolver } from '../src/conversation/message.resolver';
import { CountryResolver } from '../src/country/country.resolver';
import { DeliveryCompanyResolver } from '../src/delivery-company/delivery-company.resolver';
import { FaqResolver } from '../src/faq/faq.resolver';
import { FavoriteResolver } from '../src/favorite/favorite.resolver';
import { ListingResolver } from '../src/listing/listing.resolver';
import { NotificationResolver } from '../src/notification/notification.resolver';
import { PaymentResolver } from '../src/payment/payment.resolver';
import { PermissionResolver } from '../src/permission/permission.resolver';
import { ProviderResolver } from '../src/provider/provider.resolver';
import { RatingResolver } from '../src/rating/rating.resolver';
import { ReportResolver } from '../src/report/report.resolver';
import { SettingResolver } from '../src/setting/setting.resolver';
import { SignedContractResolver } from '../src/signed-contract/signed-contract.resolver';
import { TrackingResolver } from '../src/tracking/tracking.resolver';
import { UserResolver } from '../src/user/user.resolver';

const resolvers = [
  AdminPermissionResolver,
  AdminAuthResolver,
  AdminResolver,
  AuthResolver,
  ProviderAuthResolver,
  BankResolver,
  CategoryResolver,
  CityResolver,
  ComplaintResolver,
  ContactMessageResolver,
  ContractResolver,
  ConversationResolver,
  MessageResolver,
  CountryResolver,
  DeliveryCompanyResolver,
  FaqResolver,
  FavoriteResolver,
  ListingResolver,
  NotificationResolver,
  PaymentResolver,
  PermissionResolver,
  ProviderResolver,
  RatingResolver,
  ReportResolver,
  SettingResolver,
  SignedContractResolver,
  TrackingResolver,
  UserResolver,
];

async function generate() {
  const moduleRef = await Test.createTestingModule({
    imports: [GraphQLSchemaBuilderModule],
  }).compile();
  try {
    const schema = await moduleRef.get(GraphQLSchemaFactory).create(resolvers, {
      scalarsMap: [{ type: () => Object, scalar: GraphQLJSON }],
    });
    const outputPath = resolve(
      process.argv[2] ?? 'generated/graphql-schema.graphql',
    );
    writeFileSync(outputPath, printSchema(lexicographicSortSchema(schema)));
    process.stdout.write(`${outputPath}\n`);
  } finally {
    await moduleRef.close();
  }
}

void generate();
