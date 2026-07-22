import { Test, TestingModule } from '@nestjs/testing';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { lexicographicSortSchema, printSchema } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ConversationResolver } from './conversation/conversation.resolver';
import { MessageResolver } from './conversation/message.resolver';
import { ContractResolver } from './contract/contract.resolver';
import { PaymentResolver } from './payment/payment.resolver';
import { FavoriteResolver } from './favorite/favorite.resolver';
import { ComplaintResolver } from './complaint/complaint.resolver';
import { ListingResolver } from './listing/listing.resolver';
import { ReportResolver } from './report/report.resolver';

describe('public transaction GraphQL schema', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('exposes intent-based operations and omits unsafe generic mutations', async () => {
    const schemaFactory = module.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create(
      [
        ConversationResolver,
        MessageResolver,
        ContractResolver,
        PaymentResolver,
        FavoriteResolver,
        ComplaintResolver,
        ListingResolver,
        ReportResolver,
      ],
      {
        scalarsMap: [{ type: () => Object, scalar: GraphQLJSON }],
      },
    );
    const sdl = printSchema(lexicographicSortSchema(schema));

    expect(sdl).toContain(
      'createConversation(input: CreateConversationInput!)',
    );
    expect(sdl).toContain('markConversationRead(conversationId: String!)');
    expect(sdl).toContain('restartConversation(conversationId: String!)');
    expect(sdl).toContain('contractQuote(input: ContractQuoteInput!)');
    expect(sdl).toContain('acceptContract(input: AcceptContractInput!)');
    expect(sdl).toContain('rejectContract(input: RejectContractInput!)');
    expect(sdl).toContain('completeContract(input: CompleteContractInput!)');
    expect(sdl).toContain('resendContract(input: ResendContractInput!)');
    expect(sdl).toContain('payContract(contractId: String!)');
    expect(sdl).toContain('payConversationFee(conversationId: String!)');
    expect(sdl).toContain('payPremiumAd(listingId: String!)');
    expect(sdl).toContain(
      'setProviderFavorite(favorite: Boolean!, providerId: String!)',
    );
    expect(sdl).toContain('myFavoriteProviders(');
    expect(sdl).toContain('isProviderFavorite(providerId: String!)');
    expect(sdl).toContain('requestFeaturedPromotion(listingId: ID!)');
    expect(sdl).toContain('createComplaint(');
    expect(sdl).toContain('myComplaints(');
    expect(sdl).toContain('adminComplaints(');
    expect(sdl).toContain('conversationFeeReport(');
    expect(sdl).toContain('premiumAdFeeReport(');

    for (const removedMutation of [
      'updateConversation',
      'removeConversation',
      'updateMessage',
      'removeMessage',
      'updateContract',
      'removeContract',
      'createPayment',
      'updatePayment',
      'removePayment',
      'refundPayment',
      'createFavorite',
      'updateFavorite',
      'removeFavorite',
      'updateComplaint',
      'removeComplaint',
      'reviewComplaint',
    ]) {
      expect(sdl).not.toContain(`${removedMutation}(`);
    }
  });
});
